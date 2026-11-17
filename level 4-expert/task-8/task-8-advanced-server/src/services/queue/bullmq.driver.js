const { Queue, Worker } = require('bullmq');
const { createRedisClient } = require('../../config/redis');
const { executeJob } = require('../../jobs/processors');

const QUEUE_NAME = 'opsdesk-tasks';

/**
 * BullMQ Task Queue Driver
 * Manages distributed background job execution via Redis.
 */
class BullMQQueueDriver {
  constructor() {
    this.mode = 'redis';
    this.connection = createRedisClient();
    this.queue = new Queue(QUEUE_NAME, {
      connection: this.connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 100 },
      },
    });

    this.worker = null;
  }

  /**
   * Initializes standalone or embedded BullMQ Worker
   */
  async startWorker() {
    if (this.worker) return this;

    const workerConnection = createRedisClient();

    this.worker = new Worker(
      QUEUE_NAME,
      async (job) => {
        return executeJob(job.name, job.data, async (percent) => {
          await job.updateProgress(percent);
        });
      },
      {
        connection: workerConnection,
        concurrency: 2,
      }
    );

    this.worker.on('failed', (job, err) => {
      console.warn(
        `[BullMQ Worker] Job ${job?.id} (${job?.name}) failed on attempt ${job?.attemptsMade}: ${err.message}`
      );
    });

    this.worker.on('completed', (job) => {
      console.log(`[BullMQ Worker] Job ${job?.id} (${job?.name}) completed successfully.`);
    });

    this.worker.on('error', (err) => {
      console.error('[BullMQ Worker] Worker error:', err.message);
    });

    return this;
  }

  /**
   * Enqueues a job with idempotency and retry configuration
   */
  async addJob(name, data, opts = {}) {
    const jobId = opts.jobId ? String(opts.jobId) : undefined;

    // Idempotency check: if jobId exists, return existing job
    if (jobId) {
      const existing = await this.queue.getJob(jobId);
      if (existing) {
        const state = await existing.getState();
        return {
          id: existing.id,
          name: existing.name,
          status: state === 'waiting' ? 'queued' : state,
          isDuplicate: true,
        };
      }
    }

    const job = await this.queue.add(name, data, {
      jobId,
      attempts: opts.attempts || 3,
      backoff: opts.backoff || { type: 'exponential', delay: 1000 },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 100 },
    });

    return {
      id: job.id,
      name: job.name,
      status: 'queued',
    };
  }

  /**
   * Normalizes BullMQ job format to the standard interface
   */
  async normalizeJob(job) {
    if (!job) return null;
    const state = await job.getState();

    return {
      id: job.id,
      name: job.name,
      data: job.data,
      state: state || 'unknown',
      progress: typeof job.progress === 'number' ? job.progress : (job.progress?.percent || 0),
      attemptsMade: job.attemptsMade || 0,
      maxAttempts: job.opts?.attempts || 3,
      result: job.returnvalue || null,
      failedReason: job.failedReason || null,
      timestamp: job.timestamp,
      processedOn: job.processedOn || null,
      finishedOn: job.finishedOn || null,
    };
  }

  /**
   * Fetches single job by ID
   */
  async getJob(id) {
    try {
      const job = await this.queue.getJob(String(id));
      if (!job) return null;
      return await this.normalizeJob(job);
    } catch (err) {
      console.error(`[BullMQ] Error getting job ${id}:`, err.message);
      return null;
    }
  }

  /**
   * Retrieves recent jobs and aggregated state counts
   */
  async getJobs(limit = 20) {
    const states = ['waiting', 'active', 'completed', 'failed', 'delayed'];
    const counts = await this.queue.getJobCounts(...states);
    const total = Object.values(counts).reduce((acc, val) => acc + (val || 0), 0);

    const jobs = await this.queue.getJobs(states, 0, limit - 1, true);
    const normalized = await Promise.all(jobs.map((j) => this.normalizeJob(j)));

    return {
      jobs: normalized.filter(Boolean),
      counts: {
        waiting: counts.waiting || 0,
        active: counts.active || 0,
        completed: counts.completed || 0,
        failed: counts.failed || 0,
        delayed: counts.delayed || 0,
        total,
      },
      mode: this.mode,
    };
  }

  async close() {
    if (this.worker) {
      await this.worker.close();
      this.worker = null;
    }
    await this.queue.close();
    try {
      await this.connection.quit();
    } catch (_) {
      try {
        this.connection.disconnect();
      } catch (__) {}
    }
  }
}

module.exports = BullMQQueueDriver;

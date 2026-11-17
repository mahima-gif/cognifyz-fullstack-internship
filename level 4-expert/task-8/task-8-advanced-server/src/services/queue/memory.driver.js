const crypto = require('crypto');
const { executeJob } = require('../../jobs/processors');

/**
 * In-Memory Task Queue Driver
 * Provides exact BullMQ-compatible API semantics:
 * - Concurrency control (default 2 workers)
 * - Retries with exponential backoff
 * - Progress tracking (0 - 100%)
 * - Idempotent job submission via unique ID / Idempotency-Key
 * - Job cleanup limits
 */
class MemoryQueueDriver {
  constructor({ concurrency = 2, maxStoredJobs = 100 } = {}) {
    this.concurrency = concurrency;
    this.maxStoredJobs = maxStoredJobs;
    this.mode = 'memory';
    this.jobs = new Map(); // jobId -> job
    this.activeCount = 0;
    this.isWorkerRunning = false;
    this.scheduledTimers = new Set();
  }

  /**
   * Starts the in-process worker runner
   */
  async startWorker() {
    this.isWorkerRunning = true;
    this.processNext();
    return this;
  }

  /**
   * Enqueues a job with idempotency support and retry configuration
   * @param {string} name - Job type name
   * @param {object} data - Payload
   * @param {object} [opts={}]
   * @returns {Promise<{ id: string, name: string, status: string, isDuplicate?: boolean }>}
   */
  async addJob(name, data, opts = {}) {
    const id = opts.jobId ? String(opts.jobId) : crypto.randomUUID();

    // Idempotency: Return existing job if duplicate key received
    if (this.jobs.has(id)) {
      const existing = this.jobs.get(id);
      return {
        id: existing.id,
        name: existing.name,
        status: existing.state === 'waiting' ? 'queued' : existing.state,
        isDuplicate: true,
      };
    }

    const job = {
      id,
      name,
      data,
      state: 'waiting',
      progress: 0,
      attemptsMade: 0,
      maxAttempts: opts.attempts || 3,
      backoffDelay: opts.backoff?.delay || (process.env.TEST_FAST_DELAY ? 50 : 1000),
      result: null,
      failedReason: null,
      timestamp: Date.now(),
      processedOn: null,
      finishedOn: null,
      updateProgress: async (progress) => {
        job.progress = progress;
      },
    };

    this.jobs.set(id, job);
    this.enforceStorageLimits();

    if (this.isWorkerRunning) {
      setImmediate(() => this.processNext());
    }

    return {
      id: job.id,
      name: job.name,
      status: 'queued',
    };
  }

  /**
   * Fetches single job with normalized status
   * @param {string} id
   */
  async getJob(id) {
    const job = this.jobs.get(String(id));
    if (!job) {
      return null;
    }

    return {
      id: job.id,
      name: job.name,
      data: job.data,
      state: job.state,
      progress: job.progress,
      attemptsMade: job.attemptsMade,
      maxAttempts: job.maxAttempts,
      result: job.result,
      failedReason: job.failedReason,
      timestamp: job.timestamp,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
    };
  }

  /**
   * Retrieves list of recent jobs with aggregated state counts
   * @param {number} [limit=20]
   */
  async getJobs(limit = 20) {
    const all = Array.from(this.jobs.values()).sort((a, b) => b.timestamp - a.timestamp);

    const counts = {
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      delayed: 0,
      total: all.length,
    };

    all.forEach((j) => {
      if (counts[j.state] !== undefined) {
        counts[j.state] += 1;
      }
    });

    const recent = all.slice(0, limit).map((j) => ({
      id: j.id,
      name: j.name,
      data: j.data,
      state: j.state,
      progress: j.progress,
      attemptsMade: j.attemptsMade,
      maxAttempts: j.maxAttempts,
      result: j.result,
      failedReason: j.failedReason,
      timestamp: j.timestamp,
      processedOn: j.processedOn,
      finishedOn: j.finishedOn,
    }));

    return { jobs: recent, counts, mode: this.mode };
  }

  /**
   * Worker concurrency loop: processes waiting jobs up to concurrency limit
   */
  processNext() {
    if (!this.isWorkerRunning) return;

    while (this.activeCount < this.concurrency) {
      // Find oldest waiting job
      const nextJob = Array.from(this.jobs.values())
        .filter((j) => j.state === 'waiting')
        .sort((a, b) => a.timestamp - b.timestamp)[0];

      if (!nextJob) break;

      this.executeJob(nextJob);
    }
  }

  /**
   * Runs single job execution with retry and exponential backoff
   * @param {object} job
   */
  async executeJob(job) {
    this.activeCount += 1;
    job.state = 'active';
    job.attemptsMade += 1;
    if (!job.processedOn) {
      job.processedOn = Date.now();
    }

    try {
      const output = await executeJob(job.name, job.data, async (percent) => {
        job.progress = percent;
      });

      job.result = output;
      job.progress = 100;
      job.state = 'completed';
      job.finishedOn = Date.now();
    } catch (err) {
      console.warn(`[Memory Worker] Job ${job.id} (${job.name}) attempt ${job.attemptsMade}/${job.maxAttempts} failed: ${err.message}`);

      if (job.attemptsMade < job.maxAttempts) {
        // Schedule retry with exponential backoff
        job.state = 'delayed';
        const delayMs = job.backoffDelay * Math.pow(2, job.attemptsMade - 1);

        const timer = setTimeout(() => {
          this.scheduledTimers.delete(timer);
          if (this.jobs.has(job.id)) {
            job.state = 'waiting';
            this.processNext();
          }
        }, delayMs);

        this.scheduledTimers.add(timer);
      } else {
        job.state = 'failed';
        job.failedReason = err.message;
        job.finishedOn = Date.now();
      }
    } finally {
      this.activeCount = Math.max(0, this.activeCount - 1);
      this.processNext();
    }
  }

  /**
   * Prevents uncontrolled memory growth
   */
  enforceStorageLimits() {
    if (this.jobs.size <= this.maxStoredJobs) return;

    const finished = Array.from(this.jobs.values())
      .filter((j) => j.state === 'completed' || j.state === 'failed')
      .sort((a, b) => a.timestamp - b.timestamp);

    while (this.jobs.size > this.maxStoredJobs && finished.length > 0) {
      const toRemove = finished.shift();
      this.jobs.delete(toRemove.id);
    }
  }

  /**
   * Graceful cleanup
   */
  async close() {
    this.isWorkerRunning = false;
    for (const timer of this.scheduledTimers) {
      clearTimeout(timer);
    }
    this.scheduledTimers.clear();
  }
}

module.exports = MemoryQueueDriver;

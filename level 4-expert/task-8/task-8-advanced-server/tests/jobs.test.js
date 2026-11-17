const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../app');
const queueService = require('../src/services/queue');

process.env.NODE_ENV = 'test';
process.env.TEST_FAST_DELAY = 'true';

describe('Step 2: Background Task Queue & Worker Verification', () => {
  before(async () => {
    // Start worker in test process
    await queueService.startWorker();
  });

  after(async () => {
    await queueService.close();
  });

  it('should accept and enqueue a welcome-email job with HTTP 202', async () => {
    const res = await request(app)
      .post('/api/jobs/email')
      .send({ name: 'Jordan Developer', email: 'jordan@example.com' });

    assert.equal(res.status, 202);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.status, 'queued');
    assert.ok(res.body.data.jobId);
    assert.equal(res.body.data.statusUrl, `/api/jobs/${res.body.data.jobId}`);

    const jobId = res.body.data.jobId;

    // Poll until completed
    let completed = false;
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 80));
      const statusRes = await request(app).get(`/api/jobs/${jobId}`);
      if (statusRes.body.data.state === 'completed') {
        completed = true;
        assert.ok(statusRes.body.data.result);
        assert.equal(statusRes.body.data.result.recipient, 'jordan@example.com');
        break;
      }
    }
    assert.ok(completed, 'Job should complete successfully');
  });

  it('should support Idempotency-Key to prevent duplicate job creation', async () => {
    const idempotencyKey = 'idempotent-order-987654';

    // First request
    const res1 = await request(app)
      .post('/api/jobs/email')
      .set('Idempotency-Key', idempotencyKey)
      .send({ name: 'First Submission', email: 'user@example.com' });

    assert.equal(res1.status, 202);
    const firstJobId = res1.body.data.jobId;
    assert.equal(firstJobId, idempotencyKey);

    // Second request with identical Idempotency-Key
    const res2 = await request(app)
      .post('/api/jobs/email')
      .set('Idempotency-Key', idempotencyKey)
      .send({ name: 'Duplicate Submission', email: 'user@example.com' });

    assert.equal(res2.status, 202);
    assert.equal(res2.body.data.jobId, firstJobId);
    assert.equal(res2.body.data.isDuplicate, true);
  });

  it('should retry a failing job 3 times with backoff and mark failed without crashing', async () => {
    const res = await request(app)
      .post('/api/jobs/email')
      .send({ name: 'Failure Demo', email: 'should-fail-demo@example.com' });

    assert.equal(res.status, 202);
    const jobId = res.body.data.jobId;

    // Poll until all 3 attempts have been exhausted
    let finalState = null;
    for (let i = 0; i < 40; i++) {
      await new Promise((r) => setTimeout(r, 100));
      const statusRes = await request(app).get(`/api/jobs/${jobId}`);
      finalState = statusRes.body.data;
      if (finalState.state === 'failed') {
        break;
      }
    }

    assert.equal(finalState.state, 'failed', 'Job should end in failed state after 3 attempts');
    assert.equal(finalState.attemptsMade, 3, 'Job should have made exactly 3 attempts');
    assert.ok(finalState.failedReason, 'Failed reason must be recorded');
  });

  it('should accept a report generation job and track staged progress', async () => {
    const res = await request(app)
      .post('/api/jobs/report')
      .send({ type: 'sales', rows: 500 });

    assert.equal(res.status, 202);
    const jobId = res.body.data.jobId;

    // Wait for completion
    let completed = false;
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 80));
      const statusRes = await request(app).get(`/api/jobs/${jobId}`);
      if (statusRes.body.data.state === 'completed') {
        completed = true;
        assert.equal(statusRes.body.data.progress, 100);
        assert.ok(statusRes.body.data.result.calculatedMetric);
        break;
      }
    }
    assert.ok(completed, 'Report job should complete and report 100% progress');
  });

  it('should return 404 for an unknown job ID', async () => {
    const res = await request(app).get('/api/jobs/nonexistent-id-999');
    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
  });

  it('should retrieve list of recent jobs with aggregated state counts', async () => {
    const res = await request(app).get('/api/jobs');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data.jobs));
    assert.ok(res.body.data.counts);
    assert.ok(res.body.data.counts.total >= 3);
  });
});

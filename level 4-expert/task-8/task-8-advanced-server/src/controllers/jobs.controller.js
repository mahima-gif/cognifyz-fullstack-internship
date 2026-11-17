const queueService = require('../services/queue');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Controller: Enqueue Welcome Email Job
 * POST /api/jobs/email
 */
const enqueueEmailJob = asyncHandler(async (req, res) => {
  const { name, email } = req.body;
  const idempotencyKey = req.headers['idempotency-key'];

  const job = await queueService.addJob(
    'welcome-email',
    { name, email },
    { jobId: idempotencyKey }
  );

  res.status(202).json({
    success: true,
    data: {
      jobId: job.id,
      name: job.name,
      status: job.status,
      isDuplicate: Boolean(job.isDuplicate),
      statusUrl: `/api/jobs/${job.id}`,
    },
    message: job.isDuplicate
      ? 'Existing job returned due to Idempotency-Key'
      : 'Welcome email job accepted and queued for processing',
    errors: [],
  });
});

/**
 * Controller: Enqueue Report Generation Job
 * POST /api/jobs/report
 */
const enqueueReportJob = asyncHandler(async (req, res) => {
  const { type, rows } = req.body;
  const idempotencyKey = req.headers['idempotency-key'];

  const job = await queueService.addJob(
    'generate-report',
    { type, rows: Number(rows) },
    { jobId: idempotencyKey }
  );

  res.status(202).json({
    success: true,
    data: {
      jobId: job.id,
      name: job.name,
      status: job.status,
      isDuplicate: Boolean(job.isDuplicate),
      statusUrl: `/api/jobs/${job.id}`,
    },
    message: job.isDuplicate
      ? 'Existing job returned due to Idempotency-Key'
      : 'Report generation job accepted and queued for processing',
    errors: [],
  });
});

/**
 * Controller: Retrieve single job state & progress
 * GET /api/jobs/:id
 */
const getJobStatus = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const job = await queueService.getJob(id);

  if (!job) {
    throw new AppError(`Job with ID "${id}" was not found`, 404);
  }

  res.status(200).json({
    success: true,
    data: job,
    message: 'Job status retrieved successfully',
    errors: [],
  });
});

/**
 * Controller: Retrieve recent jobs with status breakdown
 * GET /api/jobs
 */
const listRecentJobs = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 20;
  const result = await queueService.getJobs(limit);

  res.status(200).json({
    success: true,
    data: result,
    message: 'Recent jobs retrieved successfully',
    errors: [],
  });
});

module.exports = {
  enqueueEmailJob,
  enqueueReportJob,
  getJobStatus,
  listRecentJobs,
};

const processEmailJob = require('./email.job');
const processReportJob = require('./report.job');

/**
 * Registry mapping job names to handler functions.
 * Shared directly across both MemoryDriver and BullMQDriver.
 */
const jobProcessors = {
  'welcome-email': async (data, onProgress) => {
    return processEmailJob(data);
  },
  'generate-report': async (data, onProgress) => {
    return processReportJob(data, onProgress);
  },
};

/**
 * Executes a job by name
 * @param {string} jobName
 * @param {object} data
 * @param {Function} onProgress
 */
async function executeJob(jobName, data, onProgress = () => {}) {
  const handler = jobProcessors[jobName];
  if (!handler) {
    throw new Error(`No processor registered for job type "${jobName}"`);
  }
  return handler(data, onProgress);
}

module.exports = {
  jobProcessors,
  executeJob,
};

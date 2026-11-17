const reportService = require('../services/report.service');

/**
 * Report Generation Job Processor
 * @param {{ type: 'sales' | 'users', rows: number }} data
 * @param {Function} [onProgress]
 */
async function processReportJob(data, onProgress) {
  return reportService.generateReport(data, onProgress);
}

module.exports = processReportJob;

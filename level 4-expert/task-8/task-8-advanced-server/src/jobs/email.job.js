const emailService = require('../services/email.service');

/**
 * Welcome Email Job Processor
 * @param {{ name: string, email: string }} data
 */
async function processEmailJob(data) {
  return emailService.sendWelcomeEmail(data);
}

module.exports = processEmailJob;

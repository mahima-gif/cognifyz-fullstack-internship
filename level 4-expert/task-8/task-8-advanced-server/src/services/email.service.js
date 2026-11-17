/**
 * Email Service
 * Simulates asynchronous transactional email delivery.
 * Never sends real emails.
 */
class EmailService {
  /**
   * Simulates sending a welcome email with intentional failure trigger for retry demonstrations
   * @param {{ name: string, email: string }} params
   */
  async sendWelcomeEmail({ name, email }) {
    console.log(`[Email Service] Initiating delivery to ${email} (recipient: ${name})...`);

    // Simulated network transport latency (~1.5s, or shorter during test)
    const delay = process.env.TEST_FAST_DELAY ? 50 : 1500;
    await new Promise((resolve) => setTimeout(resolve, delay));

    // Intentional failure trigger to showcase exponential backoff & retries
    if (email && email.toLowerCase().includes('fail')) {
      const err = new Error(`Simulated SMTP delivery error for "${email}": Connection timeout / mailbox unavailable.`);
      console.warn(`[Email Service] Delivery failed intentionally: ${err.message}`);
      throw err;
    }

    const receipt = {
      messageId: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      recipient: email,
      recipientName: name,
      subject: `Welcome to OpsDesk, ${name}!`,
      deliveredAt: new Date().toISOString(),
      provider: 'OpsDesk-Simulated-Mailer-v1',
    };

    console.log(`[Email Service] Successfully delivered welcome email to ${email}`);
    return receipt;
  }
}

module.exports = new EmailService();

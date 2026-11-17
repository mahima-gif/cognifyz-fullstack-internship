/**
 * Report Generation Service
 * Simulates multi-stage resource-intensive background calculation with progress reporting.
 * Does not write physical files to disk.
 */
class ReportService {
  /**
   * Generates a report in staged chunks, emitting incremental progress.
   * @param {{ type: 'sales' | 'users', rows: number }} params
   * @param {Function} [onProgress] - Callback (progress: number) => Promise<void>
   */
  async generateReport({ type, rows }, onProgress = () => {}) {
    const totalSteps = 5;
    const isTest = Boolean(process.env.TEST_FAST_DELAY);
    const stepDuration = isTest ? 20 : 1000; // ~5 seconds total in normal execution

    console.log(`[Report Service] Starting report computation: type=${type}, rows=${rows}`);

    for (let step = 1; step <= totalSteps; step++) {
      await new Promise((resolve) => setTimeout(resolve, stepDuration));
      const percentage = Math.round((step / totalSteps) * 100);

      try {
        await onProgress(percentage);
      } catch (err) {
        console.warn('[Report Service] Failed to emit progress:', err.message);
      }
    }

    const calculatedTotal = type === 'sales'
      ? (rows * 128.45).toFixed(2)
      : (rows * 0.88).toFixed(0);

    const reportSummary = {
      reportType: type,
      requestedRows: rows,
      processedRows: rows,
      calculatedMetric: type === 'sales' ? `Total Revenue: $${calculatedTotal}` : `Active Accounts: ${calculatedTotal}`,
      generatedAt: new Date().toISOString(),
      fileFormat: 'PDF/CSV Simulation',
    };

    console.log(`[Report Service] Finished generating ${type} report for ${rows} records.`);
    return reportSummary;
  }
}

module.exports = new ReportService();

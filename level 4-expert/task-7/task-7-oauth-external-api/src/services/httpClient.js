/**
 * Shared HTTP Client using Axios with Timeout, Retries, and Error Mapping.
 *
 * Resilience Strategy:
 * - 5000ms Request Timeout: Prevents downstream threads from locking up when an external API is slow.
 * - Single-Attempt Retry with Exponential/Short Backoff:
 *   Automatically retries transient network glitches and upstream 5xx server errors.
 *   Strictly DOES NOT retry 4xx client errors (e.g. 404 Not Found or 429 Rate Limited),
 *   as repeat requests with unchanged inputs will only exacerbate rate limits or waste bandwidth.
 */

const axios = require('axios');
const AppError = require('../utils/AppError');

const DEFAULT_TIMEOUT_MS = 5000;
const RETRY_DELAY_MS = 300;

const httpClient = axios.create({
  timeout: DEFAULT_TIMEOUT_MS,
  headers: {
    'Accept': 'application/json',
    'User-Agent': 'CityPulse-Dashboard/1.0 (Cognifyz Internship Task 7)'
  }
});

// Interceptor for transient error retries
httpClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;

    // If no config exists, cannot retry
    if (!config) {
      return Promise.reject(error);
    }

    config.__retryCount = config.__retryCount || 0;

    // Check if error is retryable (Network error or 5xx server error, and not already retried)
    const isNetworkError = !error.response && error.code !== 'ECONNABORTED';
    const is5xxError = error.response && error.response.status >= 500;
    const canRetry = config.__retryCount < 1 && (isNetworkError || is5xxError);

    if (canRetry) {
      config.__retryCount += 1;
      // Short backoff delay before single retry
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      return httpClient(config);
    }

    return Promise.reject(error);
  }
);

/**
 * Maps Axios and network errors into sanitized, standard AppError instances.
 * This guarantees upstream internal URLs, stack traces, and query params are not leaked to clients.
 *
 * @param {Error} error - Original Axios error
 * @param {string} serviceName - Human readable service identifier (e.g. 'Open-Meteo' or 'REST Countries')
 * @returns {AppError} Standardized operational application error
 */
function mapAxiosError(error, serviceName = 'External API') {
  if (error instanceof AppError) {
    return error;
  }

  // Timeout (Client-side abort)
  if (error.code === 'ECONNABORTED' || (error.message && error.message.toLowerCase().includes('timeout'))) {
    return new AppError(`${serviceName} request timed out after ${DEFAULT_TIMEOUT_MS}ms. Please try again.`, 504);
  }

  // Upstream response received
  if (error.response) {
    const status = error.response.status;

    if (status === 404) {
      return new AppError(`The requested resource was not found on ${serviceName}.`, 404);
    }

    if (status === 429) {
      const retryAfter = parseInt(error.response.headers?.['retry-after'], 10) || 60;
      return new AppError(
        `${serviceName} rate limit exceeded. Please wait a moment before trying again.`,
        503,
        null,
        retryAfter
      );
    }

    if (status >= 500) {
      return new AppError(
        `${serviceName} is currently experiencing issues (HTTP ${status}). Upstream unavailable.`,
        502
      );
    }

    return new AppError(`${serviceName} returned an error (HTTP ${status}).`, 400);
  }

  // Upstream unreachable / DNS / connection failure
  return new AppError(
    `Unable to reach ${serviceName}. Network connectivity issue or service is offline.`,
    502
  );
}

module.exports = {
  httpClient,
  mapAxiosError
};

import { AppError, mapGitHubError } from "../errors/index.js";
import { logger } from "./logging.js";

type RetryOptions = {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
};

const DEFAULT_OPTIONS: RetryOptions = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
};

function calculateDelay(attempt: number, baseDelayMs: number, maxDelayMs: number): number {
  const delay = baseDelayMs * Math.pow(2, attempt - 1);
  return Math.min(delay, maxDelayMs);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const { maxAttempts, baseDelayMs, maxDelayMs } = { ...DEFAULT_OPTIONS, ...options };

  let lastError: AppError | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = mapGitHubError(error);

      if (!lastError.retryable || attempt === maxAttempts) {
        throw lastError;
      }

      const delayMs = calculateDelay(attempt, baseDelayMs, maxDelayMs);

      logger.warn("Reintentando operación", {
        attempt,
        maxAttempts,
        delayMs,
        errorCode: lastError.code,
        errorMessage: lastError.message,
      });

      await sleep(delayMs);
    }
  }

  throw lastError ?? mapGitHubError(new Error("Error desconocido en withRetry."));
}

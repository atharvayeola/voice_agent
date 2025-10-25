import { setTimeout as delay } from "node:timers/promises";

import type { Logger } from "./logger.js";

export interface RequestRetryOptions {
  retries: number;
  timeoutMs: number;
  logger: Logger;
  description: string;
}

const BASE_BACKOFF_MS = 150;
const MAX_BACKOFF_MS = 2_000;

export async function requestWithRetry<T>(
  factory: (signal: AbortSignal) => Promise<T>,
  options: RequestRetryOptions
): Promise<T> {
  let attempt = 0;
  let lastError: unknown;

  while (attempt <= options.retries) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs).unref();

    try {
      const result = await factory(controller.signal);
      clearTimeout(timeout);
      return result;
    } catch (error) {
      clearTimeout(timeout);
      lastError = error;
      attempt += 1;

      if (attempt > options.retries) {
        break;
      }

      const backoff = Math.min(BASE_BACKOFF_MS * 2 ** (attempt - 1), MAX_BACKOFF_MS);
      options.logger.warn(
        { description: options.description, attempt, backoffMs: backoff, err: error },
        "request attempt failed, retrying"
      );

      await delay(backoff);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(`request to ${options.description} failed after ${options.retries + 1} attempts`);
}

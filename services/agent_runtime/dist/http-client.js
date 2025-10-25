import { setTimeout as delay } from "node:timers/promises";
const BASE_BACKOFF_MS = 150;
const MAX_BACKOFF_MS = 2_000;
export async function requestWithRetry(factory, options) {
    let attempt = 0;
    let lastError;
    while (attempt <= options.retries) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), options.timeoutMs).unref();
        try {
            const result = await factory(controller.signal);
            clearTimeout(timeout);
            return result;
        }
        catch (error) {
            clearTimeout(timeout);
            lastError = error;
            attempt += 1;
            if (attempt > options.retries) {
                break;
            }
            const backoff = Math.min(BASE_BACKOFF_MS * 2 ** (attempt - 1), MAX_BACKOFF_MS);
            options.logger.warn({ description: options.description, attempt, backoffMs: backoff, err: error }, "request attempt failed, retrying");
            await delay(backoff);
        }
    }
    throw lastError instanceof Error
        ? lastError
        : new Error(`request to ${options.description} failed after ${options.retries + 1} attempts`);
}
//# sourceMappingURL=http-client.js.map
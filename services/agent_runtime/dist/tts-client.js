import { config } from "./config.js";
import { requestWithRetry } from "./http-client.js";
export async function synthesizeSpeech(request, logger) {
    return requestWithRetry(async (signal) => {
        const response = await fetch(new URL("/v1/synthesize", config.ttsServiceUrl), {
            method: "POST",
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify(request),
            signal,
        });
        if (!response.ok) {
            throw new Error(`tts service returned HTTP ${response.status}`);
        }
        const payload = (await response.json());
        return payload;
    }, {
        retries: config.maxRequestRetries,
        timeoutMs: config.requestTimeoutMs,
        logger,
        description: "tts_service",
    }).catch((error) => {
        logger.error({ err: error, sessionId: request.sessionId }, "tts synthesis failed");
        throw error;
    });
}
//# sourceMappingURL=tts-client.js.map
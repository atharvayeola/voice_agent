import { config } from "./config.js";
export async function synthesizeSpeech(request, logger) {
    try {
        const response = await fetch(new URL("/v1/synthesize", config.ttsServiceUrl), {
            method: "POST",
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify(request),
        });
        if (!response.ok) {
            throw new Error(`tts service returned HTTP ${response.status}`);
        }
        const payload = (await response.json());
        return payload;
    }
    catch (error) {
        logger.error({ err: error, sessionId: request.sessionId }, "tts synthesis failed");
        throw error;
    }
}
//# sourceMappingURL=tts-client.js.map
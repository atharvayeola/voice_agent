import { config } from "./config.js";
const RESPOND_PATH = "/v1/respond";
export async function fetchAgentResponse(payload, logger) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.agentTimeoutMs);
    try {
        const url = new URL(RESPOND_PATH, config.agentUrl);
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify(payload),
            signal: controller.signal,
        });
        if (!response.ok) {
            throw new Error(`agent returned HTTP ${response.status}`);
        }
        const data = (await response.json());
        if (typeof data.reply !== "string") {
            throw new Error("agent payload missing reply");
        }
        return {
            reply: data.reply,
            citations: Array.isArray(data.citations) ? data.citations : [],
            usedFallback: Boolean(data.usedFallback),
            latencyMs: typeof data.latencyMs === "number" ? data.latencyMs : 0,
        };
    }
    catch (error) {
        logger.error({ err: error }, "agent request failed");
        return {
            reply: config.agentFallbackResponse,
            citations: [],
            usedFallback: true,
            latencyMs: 0,
        };
    }
    finally {
        clearTimeout(timeout);
    }
}
//# sourceMappingURL=agent-client.js.map
import { config } from "./config.js";
import { requestWithRetry } from "./http-client.js";
export async function callAgent(request, logger) {
    return requestWithRetry(async (signal) => {
        const response = await fetch(new URL("/v1/respond", config.agentServiceUrl), {
            method: "POST",
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify(request),
            signal,
        });
        if (!response.ok) {
            throw new Error(`agent service returned HTTP ${response.status}`);
        }
        const payload = (await response.json());
        return payload;
    }, {
        retries: config.maxRequestRetries,
        timeoutMs: config.requestTimeoutMs,
        logger,
        description: "agent_service",
    }).catch((error) => {
        logger.error({ err: error, sessionId: request.sessionId }, "agent request failed");
        throw error;
    });
}
//# sourceMappingURL=agent-client.js.map
import { config } from "./config.js";
export async function callAgent(request, logger) {
    try {
        const response = await fetch(new URL("/v1/respond", config.agentServiceUrl), {
            method: "POST",
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify(request),
        });
        if (!response.ok) {
            throw new Error(`agent service returned HTTP ${response.status}`);
        }
        const payload = (await response.json());
        return payload;
    }
    catch (error) {
        logger.error({ err: error, sessionId: request.sessionId }, "agent request failed");
        throw error;
    }
}
//# sourceMappingURL=agent-client.js.map
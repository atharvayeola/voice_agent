import { agentRequestSchema } from "../schemas.js";
import { runAgent } from "../agent.js";
export function registerAgentRoutes(app) {
    app.post("/v1/respond", async (request, reply) => {
        const parsed = agentRequestSchema.safeParse(request.body);
        if (!parsed.success) {
            request.log.warn({ validationError: parsed.error.format() }, "invalid agent request payload");
            reply.status(400).send({
                error: "invalid_payload",
                details: parsed.error.flatten(),
            });
            return;
        }
        const response = await runAgent(parsed.data, request.log);
        reply.send(response);
    });
}
//# sourceMappingURL=agent.js.map
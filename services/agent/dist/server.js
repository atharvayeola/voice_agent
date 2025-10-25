import Fastify from "fastify";
import underPressure from "@fastify/under-pressure";
import { config } from "./config.js";
import { registerAgentRoutes } from "./routes/agent.js";
import { knowledgeHealthcheck, shutdownKnowledge } from "./knowledge.js";
export function buildServer() {
    const app = Fastify({
        logger: {
            level: config.logLevel,
            name: "agent",
        },
    });
    app.register(underPressure, {
        exposeStatusRoute: {
            routeOpts: {
                url: "/healthz",
            },
        },
    });
    app.get("/readyz", async () => {
        const dependencies = await knowledgeHealthcheck();
        const ready = dependencies.database.state === "ok" && dependencies.qdrant.state === "ok";
        return {
            status: ready ? "ready" : "degraded",
            dependencies,
        };
    });
    registerAgentRoutes(app);
    app.addHook("onClose", async () => {
        await shutdownKnowledge();
    });
    return app;
}
//# sourceMappingURL=server.js.map
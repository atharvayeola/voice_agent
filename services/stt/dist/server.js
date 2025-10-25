import Fastify from "fastify";
import underPressure from "@fastify/under-pressure";
import { config } from "./config.js";
import { registerTranscribeRoutes } from "./routes/transcribe.js";
export function buildServer() {
    const app = Fastify({
        logger: {
            level: config.logLevel,
            name: "stt",
        },
    });
    app.register(underPressure, {
        exposeStatusRoute: {
            routeOpts: {
                url: "/healthz",
            },
        },
    });
    app.get("/readyz", async () => ({ status: "ready" }));
    registerTranscribeRoutes(app);
    return app;
}
//# sourceMappingURL=server.js.map
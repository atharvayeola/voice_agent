import Fastify from "fastify";
import underPressure from "@fastify/under-pressure";
import { config } from "./config.js";
import { registerSynthesizeRoutes } from "./routes/synthesize.js";
export function buildServer() {
    const app = Fastify({
        logger: {
            level: config.logLevel,
            name: "tts",
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
    registerSynthesizeRoutes(app);
    return app;
}
//# sourceMappingURL=server.js.map
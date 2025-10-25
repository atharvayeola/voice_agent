import Fastify from "fastify";
import formbody from "@fastify/formbody";
import underPressure from "@fastify/under-pressure";

import { config } from "./config.js";
import { registerTwilioRoutes } from "./routes/twilio.js";

export function buildServer() {
  const app = Fastify({
    logger: {
      level: config.logLevel,
      name: "gateway",
    },
  });

  app.register(underPressure, {
    exposeStatusRoute: {
      routeOpts: {
        url: "/healthz",
      },
    },
  });

  app.register(formbody);

  app.get("/readyz", async () => ({ status: "ready" }));

  registerTwilioRoutes(app);

  return app;
}

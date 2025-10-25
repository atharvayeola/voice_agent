import express, { type NextFunction, type Request, type Response } from "express";
import promBundle from "express-prom-bundle";

import { config } from "./config.js";
import { buildLogger, type Logger } from "./logger.js";
import { SessionStore } from "./session-store.js";
import { registerSessionRoutes } from "./routes/sessions.js";

export function buildServer(logger: Logger = buildLogger()) {
  const app = express();
  const sessionStore = new SessionStore();

  app.disable("x-powered-by");
  app.use(express.json());

  const metricsMiddleware = promBundle({
    includeMethod: true,
    includePath: true,
    customLabels: { service: "agent_runtime" },
    promClient: {
      collectDefaultMetrics: {},
    },
  });

  app.use(metricsMiddleware);

  app.get("/healthz", (_req: Request, res: Response) => {
    res.json({ status: "ok" });
  });

  app.get("/readyz", (_req: Request, res: Response) => {
    const sessions = sessionStore.snapshot();
    res.json({
      status: "ready",
      activeSessions: sessions.length,
    });
  });

  registerSessionRoutes(app, sessionStore, logger);

  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    logger.error({ err: error }, "unhandled error");
    res.status(500).json({ error: "internal_error" });
  });

  return app;
}

export async function startServer() {
  const logger = buildLogger();
  const app = buildServer(logger);

  return new Promise<void>((resolve, reject) => {
    app
      .listen(config.port, config.host, () => {
        logger.info({ host: config.host, port: config.port }, "agent runtime listening");
        resolve();
      })
      .on("error", (error: unknown) => {
        logger.error({ err: error }, "failed to start agent runtime");
        reject(error);
      });
  });
}

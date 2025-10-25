import express from "express";
import promBundle from "express-prom-bundle";
import { config } from "./config.js";
import { buildLogger } from "./logger.js";
import { SessionCapacityError, SessionStore } from "./session-store.js";
import { registerSessionRoutes } from "./routes/sessions.js";
export function buildServer(logger = buildLogger()) {
    const app = express();
    const sessionStore = new SessionStore({
        maxSessions: config.maxConcurrentSessions,
        sessionTtlMs: config.sessionTtlMs,
        jitterWindowMs: config.jitterSlidingWindowMs,
    });
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
    app.get("/healthz", (_req, res) => {
        res.json({ status: "ok" });
    });
    app.get("/readyz", (_req, res) => {
        const sessions = sessionStore.snapshot();
        res.json({
            status: "ready",
            activeSessions: sessions.length,
        });
    });
    registerSessionRoutes(app, sessionStore, logger);
    const cleanupIntervalMs = Math.min(Math.max(config.sessionTtlMs / 2, 10_000), 60_000);
    const cleanupTimer = setInterval(() => {
        const evicted = sessionStore.cleanupExpired();
        if (evicted.length > 0) {
            logger.warn({ evictedCount: evicted.length, evicted }, "evicted expired sessions");
        }
    }, cleanupIntervalMs);
    cleanupTimer.unref();
    app.locals.sessionCleanupTimer = cleanupTimer;
    app.use((error, _req, res, _next) => {
        logger.error({ err: error }, "unhandled error");
        if (error instanceof SessionCapacityError) {
            res.status(429).json({ error: "session_capacity_reached" });
            return;
        }
        res.status(500).json({ error: "internal_error" });
    });
    return app;
}
export async function startServer() {
    const logger = buildLogger();
    const app = buildServer(logger);
    return new Promise((resolve, reject) => {
        app
            .listen(config.port, config.host, () => {
            logger.info({ host: config.host, port: config.port }, "agent runtime listening");
            resolve();
        })
            .on("error", (error) => {
            logger.error({ err: error }, "failed to start agent runtime");
            reject(error);
        });
    });
}
//# sourceMappingURL=server.js.map
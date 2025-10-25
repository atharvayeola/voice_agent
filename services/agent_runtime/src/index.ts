import "dotenv/config";

import { config } from "./config.js";
import { buildLogger } from "./logger.js";
import { buildServer } from "./server.js";

const logger = buildLogger();
const app = buildServer(logger);
const server = app.listen(config.port, config.host, () => {
  logger.info({ host: config.host, port: config.port }, "agent runtime listening");
});

server.on("error", (error: unknown) => {
  logger.error({ err: error }, "agent runtime failed to start");
  process.exit(1);
});

const shutdownSignals: NodeJS.Signals[] = ["SIGINT", "SIGTERM"];
for (const signal of shutdownSignals) {
  process.once(signal, () => {
    logger.info({ signal }, "received shutdown signal");
    server.close((error: Error | null | undefined) => {
      if (error) {
        logger.error({ err: error }, "error during shutdown");
        process.exit(1);
        return;
      }

      const cleanupTimer = app.locals.sessionCleanupTimer as NodeJS.Timeout | undefined;
      if (cleanupTimer) {
        clearInterval(cleanupTimer);
      }

      logger.info("agent runtime shut down gracefully");
      process.exit(0);
    });
  });
}

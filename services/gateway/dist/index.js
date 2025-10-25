import "dotenv/config";
import { buildServer } from "./server.js";
import { config } from "./config.js";
let server;
async function start() {
    server = buildServer();
    try {
        await server.listen({ port: config.port, host: config.host });
        server.log.info({ host: config.host, port: config.port }, "gateway listening");
    }
    catch (error) {
        server.log.error({ err: error }, "gateway failed to start");
        process.exit(1);
    }
}
async function shutdown(signal) {
    if (!server) {
        process.exit(0);
        return;
    }
    server.log.info({ signal }, "received shutdown signal");
    try {
        await server.close();
        server.log.info("gateway shut down gracefully");
        process.exit(0);
    }
    catch (error) {
        server.log.error({ err: error }, "error during shutdown");
        process.exit(1);
    }
}
const signals = ["SIGINT", "SIGTERM"]; // handle Ctrl+C and container stop
for (const signal of signals) {
    process.once(signal, () => {
        void shutdown(signal);
    });
}
void start();
//# sourceMappingURL=index.js.map
import "dotenv/config";
import { buildServer } from "./server.js";
import { config } from "./config.js";
async function start() {
    const app = buildServer();
    try {
        await app.listen({ host: config.host, port: config.port });
        app.log.info({ host: config.host, port: config.port }, "agent service listening");
    }
    catch (error) {
        app.log.error({ err: error }, "agent service failed to start");
        process.exit(1);
    }
}
void start();
//# sourceMappingURL=index.js.map
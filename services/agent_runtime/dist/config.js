import { z } from "zod";
const LOG_LEVELS = ["fatal", "error", "warn", "info", "debug", "trace", "silent"];
const envSchema = z.object({
    host: z.string().default("0.0.0.0"),
    port: z.coerce.number().int().min(1).max(65_535).default(8090),
    logLevel: z.enum(LOG_LEVELS).default("info"),
    agentServiceUrl: z.string().url().default("http://localhost:9102"),
    ttsServiceUrl: z.string().url().default("http://localhost:9103"),
    metricsIngestUrl: z.string().url().default("http://localhost:9105/ingest/turn"),
    latencyTargetMs: z.coerce.number().int().min(100).max(10_000).default(600),
    livekitHost: z.string().url().default("http://localhost:7880"),
    livekitApiKey: z.string().min(1).optional(),
    livekitApiSecret: z.string().min(1).optional(),
});
function resolveEnv() {
    const parsed = envSchema.safeParse({
        host: process.env.AGENT_RUNTIME_HOST ?? process.env.HOST,
        port: process.env.AGENT_RUNTIME_PORT ?? process.env.PORT,
        logLevel: process.env.LOG_LEVEL,
        agentServiceUrl: process.env.AGENT_SERVICE_URL,
        ttsServiceUrl: process.env.TTS_SERVICE_URL,
        metricsIngestUrl: process.env.METRICS_INGEST_URL,
        latencyTargetMs: process.env.LATENCY_TARGET_MS,
        livekitHost: process.env.LIVEKIT_HOST,
        livekitApiKey: process.env.LIVEKIT_API_KEY,
        livekitApiSecret: process.env.LIVEKIT_API_SECRET,
    });
    if (!parsed.success) {
        throw new Error(`Invalid agent runtime configuration: ${parsed.error.message}`);
    }
    return parsed.data;
}
export const config = resolveEnv();
//# sourceMappingURL=config.js.map
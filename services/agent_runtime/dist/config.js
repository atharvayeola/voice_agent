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
    maxConcurrentSessions: z.coerce.number().int().min(1).max(10_000).default(300),
    sessionTtlMs: z.coerce.number().int().min(1_000).max(86_400_000).default(15 * 60 * 1000),
    requestTimeoutMs: z.coerce.number().int().min(100).max(60_000).default(5_000),
    maxRequestRetries: z.coerce.number().int().min(0).max(10).default(2),
    jitterSlidingWindowMs: z.coerce.number().int().min(50).max(10_000).default(500),
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
        maxConcurrentSessions: process.env.MAX_CONCURRENT_SESSIONS,
        sessionTtlMs: process.env.SESSION_TTL_MS,
        requestTimeoutMs: process.env.REQUEST_TIMEOUT_MS,
        maxRequestRetries: process.env.MAX_REQUEST_RETRIES,
        jitterSlidingWindowMs: process.env.JITTER_SLIDING_WINDOW_MS,
    });
    if (!parsed.success) {
        throw new Error(`Invalid agent runtime configuration: ${parsed.error.message}`);
    }
    return parsed.data;
}
export const config = resolveEnv();
//# sourceMappingURL=config.js.map
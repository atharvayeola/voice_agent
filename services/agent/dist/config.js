import { z } from "zod";
const envSchema = z.object({
    host: z.string().default("0.0.0.0"),
    port: z.coerce.number().int().min(1).max(65_535).default(9102),
    logLevel: z
        .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
        .default("info"),
    databaseUrl: z
        .string()
        .url()
        .default("postgres://voice_agent:voice_agent@localhost:5432/voice_agent"),
    qdrantUrl: z.string().url().default("http://localhost:6333"),
    qdrantCollection: z.string().min(1).default("voice_agent_kb"),
    embeddingDim: z.coerce.number().int().min(16).max(2048).default(256),
    maxMatches: z.coerce.number().int().min(1).max(10).default(3),
    scoreThreshold: z.coerce.number().min(0).max(1).default(0.2),
    fallbackResponse: z
        .string()
        .default("I don’t have that information right now, but I’ve logged the request for follow-up."),
    metricsIngestUrl: z.string().url().optional(),
});
const raw = {
    host: process.env.AGENT_HOST ?? process.env.HOST,
    port: process.env.AGENT_PORT ?? process.env.PORT,
    logLevel: process.env.LOG_LEVEL,
    databaseUrl: process.env.DATABASE_URL,
    qdrantUrl: process.env.QDRANT_URL,
    qdrantCollection: process.env.QDRANT_COLLECTION,
    embeddingDim: process.env.EMBEDDING_DIM,
    maxMatches: process.env.AGENT_MAX_MATCHES,
    scoreThreshold: process.env.AGENT_SCORE_THRESHOLD,
    fallbackResponse: process.env.AGENT_FALLBACK_RESPONSE,
    metricsIngestUrl: process.env.AGENT_METRICS_INGEST_URL ?? process.env.METRICS_INGEST_URL,
};
export const config = envSchema.parse(raw);
//# sourceMappingURL=config.js.map
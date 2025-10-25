import { z } from "zod";
const envSchema = z.object({
    host: z.string().default("0.0.0.0"),
    port: z.coerce.number().int().min(1).max(65_535).default(9104),
    logLevel: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
    databaseUrl: z.string().url().default("postgres://voice_agent:voice_agent@localhost:5432/voice_agent"),
    qdrantUrl: z.string().url().default("http://localhost:6333"),
    qdrantCollection: z.string().min(1).default("voice_agent_kb"),
    embeddingDim: z.coerce.number().int().min(16).max(2048).default(256),
});
const raw = {
    host: process.env.KB_INGEST_HOST ?? process.env.HOST,
    port: process.env.KB_INGEST_PORT ?? process.env.PORT,
    logLevel: process.env.LOG_LEVEL,
    databaseUrl: process.env.DATABASE_URL,
    qdrantUrl: process.env.QDRANT_URL,
    qdrantCollection: process.env.QDRANT_COLLECTION,
    embeddingDim: process.env.EMBEDDING_DIM,
};
export const config = envSchema.parse(raw);
//# sourceMappingURL=config.js.map
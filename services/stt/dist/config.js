import { z } from "zod";
const LOG_LEVELS = ["fatal", "error", "warn", "info", "debug", "trace", "silent"];
const envSchema = z.object({
    host: z.string().default("0.0.0.0"),
    port: z.coerce.number().int().min(1).max(65_535).default(9101),
    logLevel: z.enum(LOG_LEVELS).default("info"),
    defaultLanguage: z.string().default("en-US"),
    segmentLengthMs: z.coerce.number().int().min(50).max(5_000).default(600),
    chunkCharacters: z.coerce.number().int().min(20).max(600).default(120),
    baseConfidence: z.coerce.number().min(0).max(1).default(0.92),
});
function resolveEnv() {
    const parsed = envSchema.safeParse({
        host: process.env.STT_HOST ?? process.env.HOST,
        port: process.env.STT_PORT ?? process.env.PORT,
        logLevel: process.env.LOG_LEVEL,
        defaultLanguage: process.env.STT_LANGUAGE,
        segmentLengthMs: process.env.STT_SEGMENT_MS,
        chunkCharacters: process.env.STT_CHARS_PER_SEGMENT,
        baseConfidence: process.env.STT_CONFIDENCE,
    });
    if (!parsed.success) {
        throw new Error(`Invalid STT configuration: ${parsed.error.message}`);
    }
    return parsed.data;
}
export const config = resolveEnv();
//# sourceMappingURL=config.js.map
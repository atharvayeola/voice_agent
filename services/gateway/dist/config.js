import { z } from "zod";
const LOG_LEVELS = ["fatal", "error", "warn", "info", "debug", "trace", "silent"];
const envSchema = z.object({
    host: z.string().default("0.0.0.0"),
    port: z.coerce.number().int().min(1).max(65_535).default(8080),
    logLevel: z.enum(LOG_LEVELS).default("info"),
    twilioAuthToken: z.string().min(1, "TWILIO_AUTH_TOKEN is required to validate webhooks").optional(),
    publicUrl: z.string().url().optional(),
    agentUrl: z.string().url().default("http://localhost:9102"),
    agentTimeoutMs: z.coerce.number().int().min(500).max(60_000).default(3_000),
    agentFallbackResponse: z
        .string()
        .default("I'm still reviewing that question. Please try again shortly."),
    twilioVoice: z.string().default("Polly.Joanna"),
    twilioLanguage: z.string().default("en-US"),
});
function resolveEnv() {
    const parseResult = envSchema.safeParse({
        host: process.env.GATEWAY_HOST ?? process.env.HOST,
        port: process.env.GATEWAY_PORT ?? process.env.PORT,
        logLevel: process.env.LOG_LEVEL,
        twilioAuthToken: process.env.TWILIO_AUTH_TOKEN,
        publicUrl: process.env.PUBLIC_URL ?? process.env.TWILIO_WEBHOOK_HOST,
        agentUrl: process.env.AGENT_URL,
        agentTimeoutMs: process.env.AGENT_TIMEOUT_MS,
        agentFallbackResponse: process.env.AGENT_FALLBACK_RESPONSE,
        twilioVoice: process.env.TWILIO_VOICE,
        twilioLanguage: process.env.TWILIO_LANGUAGE,
    });
    if (!parseResult.success) {
        throw new Error(`Invalid gateway configuration: ${parseResult.error.message}`);
    }
    return parseResult.data;
}
export const config = resolveEnv();
//# sourceMappingURL=config.js.map
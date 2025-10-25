import { z } from "zod";

const LOG_LEVELS = ["fatal", "error", "warn", "info", "debug", "trace", "silent"] as const;

const envSchema = z.object({
  host: z.string().default("0.0.0.0"),
  port: z.coerce.number().int().min(1).max(65_535).default(8080),
  logLevel: z.enum(LOG_LEVELS).default("info"),
  twilioAuthToken: z.string().min(1, "TWILIO_AUTH_TOKEN is required to validate webhooks").optional(),
  publicUrl: z.string().url().optional(),
  agentRuntimeUrl: z.string().url().default("http://localhost:8090"),
  agentRuntimeTimeoutMs: z.coerce.number().int().min(500).max(60_000).default(3_000),
  agentFallbackResponse: z
    .string()
    .default("I'm still reviewing that question. Please try again shortly."),
  twilioVoice: z.string().default("Polly.Joanna"),
  twilioLanguage: z.string().default("en-US"),
  livekitHost: z.string().url().default("http://localhost:7880"),
  livekitApiKey: z.string().min(1).default("devkey"),
  livekitApiSecret: z.string().min(1).default("devsecret"),
  livekitSipUri: z.string().min(5).default("sip:ingress@livekit.local"),
  livekitSipUsername: z.string().min(1).optional(),
  livekitSipPassword: z.string().min(1).optional(),
  livekitRoomPrefix: z.string().default("call-"),
  livekitAgentIdentityPrefix: z.string().default("agent-"),
  livekitSipIdentityPrefix: z.string().default("pstn-"),
  livekitRoomEmptyTimeoutSeconds: z.coerce
    .number()
    .int()
    .min(10)
    .max(43_200)
    .default(60),
  livekitTokenTtlSeconds: z.coerce.number().int().min(60).max(86_400).default(3_600),
});

type EnvConfig = z.infer<typeof envSchema>;

function resolveEnv(): EnvConfig {
  const parseResult = envSchema.safeParse({
    host: process.env.GATEWAY_HOST ?? process.env.HOST,
    port: process.env.GATEWAY_PORT ?? process.env.PORT,
    logLevel: process.env.LOG_LEVEL,
    twilioAuthToken: process.env.TWILIO_AUTH_TOKEN,
    publicUrl: process.env.PUBLIC_URL ?? process.env.TWILIO_WEBHOOK_HOST,
    agentRuntimeUrl: process.env.AGENT_RUNTIME_URL ?? process.env.AGENT_URL,
    agentRuntimeTimeoutMs: process.env.AGENT_RUNTIME_TIMEOUT_MS ?? process.env.AGENT_TIMEOUT_MS,
    agentFallbackResponse: process.env.AGENT_FALLBACK_RESPONSE,
    twilioVoice: process.env.TWILIO_VOICE,
    twilioLanguage: process.env.TWILIO_LANGUAGE,
    livekitHost: process.env.LIVEKIT_HOST,
    livekitApiKey: process.env.LIVEKIT_API_KEY,
    livekitApiSecret: process.env.LIVEKIT_API_SECRET,
    livekitSipUri: process.env.LIVEKIT_SIP_URI,
    livekitSipUsername: process.env.LIVEKIT_SIP_USERNAME,
    livekitSipPassword: process.env.LIVEKIT_SIP_PASSWORD,
    livekitRoomPrefix: process.env.LIVEKIT_ROOM_PREFIX,
    livekitAgentIdentityPrefix: process.env.LIVEKIT_AGENT_IDENTITY_PREFIX,
    livekitSipIdentityPrefix: process.env.LIVEKIT_SIP_IDENTITY_PREFIX,
    livekitRoomEmptyTimeoutSeconds: process.env.LIVEKIT_ROOM_EMPTY_TIMEOUT_SECONDS,
    livekitTokenTtlSeconds: process.env.LIVEKIT_TOKEN_TTL_SECONDS,
  });

  if (!parseResult.success) {
    throw new Error(`Invalid gateway configuration: ${parseResult.error.message}`);
  }

  return parseResult.data;
}

export const config = resolveEnv();
export type GatewayConfig = typeof config;

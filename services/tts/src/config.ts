import { z } from "zod";

const LOG_LEVELS = ["fatal", "error", "warn", "info", "debug", "trace", "silent"] as const;

const envSchema = z.object({
  host: z.string().default("0.0.0.0"),
  port: z.coerce.number().int().min(1).max(65_535).default(9103),
  logLevel: z.enum(LOG_LEVELS).default("info"),
  voice: z.string().default("alloy"),
  language: z.string().default("en-US"),
  sampleRate: z.coerce.number().int().min(8_000).max(48_000).default(16_000),
  msPerCharacter: z.coerce.number().int().min(20).max(200).default(60),
});

function resolveEnv() {
  const parsed = envSchema.safeParse({
    host: process.env.TTS_HOST ?? process.env.HOST,
    port: process.env.TTS_PORT ?? process.env.PORT,
    logLevel: process.env.LOG_LEVEL,
    voice: process.env.TTS_VOICE,
    language: process.env.TTS_LANGUAGE,
    sampleRate: process.env.TTS_SAMPLE_RATE,
    msPerCharacter: process.env.TTS_MS_PER_CHAR,
  });

  if (!parsed.success) {
    throw new Error(`Invalid TTS configuration: ${parsed.error.message}`);
  }

  return parsed.data;
}

export const config = resolveEnv();
export type TtsConfig = typeof config;

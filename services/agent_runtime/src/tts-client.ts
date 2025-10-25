import type { Logger } from "./logger.js";
import { config } from "./config.js";
import { requestWithRetry } from "./http-client.js";

export interface SynthesizeRequest {
  sessionId: string;
  text: string;
  voice?: string;
  language?: string;
  metadata?: Record<string, unknown> | undefined;
}

export interface SynthesizeResult {
  sessionId: string;
  voice: string;
  language: string;
  audio: string;
  audioFormat: "linear16";
  sampleRate: number;
  durationMs: number;
  metadata: Record<string, unknown>;
}

export async function synthesizeSpeech(
  request: SynthesizeRequest,
  logger: Logger
): Promise<SynthesizeResult> {
  return requestWithRetry(
    async (signal) => {
      const response = await fetch(new URL("/v1/synthesize", config.ttsServiceUrl), {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(request),
        signal,
      });

      if (!response.ok) {
        throw new Error(`tts service returned HTTP ${response.status}`);
      }

      const payload = (await response.json()) as SynthesizeResult;
      return payload;
    },
    {
      retries: config.maxRequestRetries,
      timeoutMs: config.requestTimeoutMs,
      logger,
      description: "tts_service",
    }
  ).catch((error) => {
    logger.error({ err: error, sessionId: request.sessionId }, "tts synthesis failed");
    throw error;
  });
}

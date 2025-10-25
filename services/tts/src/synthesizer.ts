import { config } from "./config.js";
import type { SynthesizeRequest, SynthesizeResult } from "./schemas.js";

function normalize(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

export function buildSynthesis(payload: SynthesizeRequest): SynthesizeResult {
  const normalized = normalize(payload.text);

  if (!normalized) {
    throw new Error("Synthesis text must not be empty");
  }

  const voice = payload.voice ?? config.voice;
  const language = payload.language ?? config.language;

  if (payload.metadata?.bargeInHandled === true) {
    return {
      sessionId: payload.sessionId,
      voice,
      language,
      audio: "",
      audioFormat: "linear16",
      sampleRate: config.sampleRate,
      durationMs: 0,
      metadata: {
        ...payload.metadata,
        interrupted: true,
      },
    } satisfies SynthesizeResult;
  }

  const audioBuffer = Buffer.from(`${voice}|${language}|${normalized}`, "utf8");
  const audio = audioBuffer.toString("base64");

  const durationMs = Math.max(config.msPerCharacter, normalized.length * config.msPerCharacter);

  return {
    sessionId: payload.sessionId,
    voice,
    language,
    audio,
    audioFormat: "linear16",
    sampleRate: config.sampleRate,
    durationMs,
    metadata: {
      ...payload.metadata,
      characters: normalized.length,
    },
  } satisfies SynthesizeResult;
}

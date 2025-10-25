import { z } from "zod";

export const synthesizeRequestSchema = z.object({
  sessionId: z.string().min(1).default(() => `sess-${Date.now()}`),
  text: z.string().min(1),
  voice: z.string().optional(),
  language: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type SynthesizeRequest = z.infer<typeof synthesizeRequestSchema>;

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

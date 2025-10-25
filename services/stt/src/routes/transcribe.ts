import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

import { transcribeRequestSchema } from "../schemas.js";
import { generateTranscription } from "../transcriber.js";

type TranscribeRequestBody = {
  sessionId?: string;
  language?: string;
  text?: string;
  audio?: string;
  metadata?: Record<string, unknown>;
};

export function registerTranscribeRoutes(app: FastifyInstance) {
  app.post<{ Body: TranscribeRequestBody }>("/v1/transcribe", async (request: FastifyRequest<{ Body: TranscribeRequestBody }>, reply: FastifyReply) => {
    const parsed = transcribeRequestSchema.safeParse(request.body ?? {});

    if (!parsed.success) {
      request.log.warn({ validationError: parsed.error.format() }, "invalid transcribe payload");
      reply.code(400).send({
        error: "invalid_payload",
        details: parsed.error.flatten(),
      });
      return;
    }

    try {
      const result = generateTranscription(parsed.data);
      reply.send(result);
    } catch (error) {
      request.log.error({ err: error }, "transcription failed");
      reply.code(422).send({ error: "transcription_failed" });
    }
  });
}

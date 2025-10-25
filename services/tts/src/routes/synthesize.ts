import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

import { synthesizeRequestSchema } from "../schemas.js";
import { buildSynthesis } from "../synthesizer.js";

type SynthesizeBody = {
  sessionId?: string;
  text?: string;
  voice?: string;
  language?: string;
  metadata?: Record<string, unknown>;
};

export function registerSynthesizeRoutes(app: FastifyInstance) {
  app.post<{ Body: SynthesizeBody }>("/v1/synthesize", async (request: FastifyRequest<{ Body: SynthesizeBody }>, reply: FastifyReply) => {
    const parsed = synthesizeRequestSchema.safeParse(request.body ?? {});

    if (!parsed.success) {
      request.log.warn({ validationError: parsed.error.format() }, "invalid synthesize payload");
      reply.code(400).send({
        error: "invalid_payload",
        details: parsed.error.flatten(),
      });
      return;
    }

    try {
      const result = buildSynthesis(parsed.data);
      reply.send(result);
    } catch (error) {
      request.log.error({ err: error }, "synthesis failed");
      reply.code(422).send({ error: "synthesis_failed" });
    }
  });
}

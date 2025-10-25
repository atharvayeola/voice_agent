import type { FastifyInstance } from "fastify";

import { config } from "../config.js";
import { twilioWebhookGuard } from "../security/twilio.js";
import { ensureRoomExists, createAgentAccessToken } from "../livekit.js";
import { startAgentSession } from "../agent-runtime-client.js";
import { buildSayResponse, buildSipDialResponse } from "../twiml.js";

type TwilioVoicePayload = Record<string, string | undefined>;

const FALLBACK_PROMPT = "We couldn't connect you to an agent just now. Please try again.";

export function registerTwilioRoutes(app: FastifyInstance) {
  app.post<{ Body: TwilioVoicePayload }>(
    "/twilio/voice",
    {
      preHandler: twilioWebhookGuard,
    },
    async (request, reply) => {
      const payload = (request.body ?? {}) as TwilioVoicePayload;
      const callSid = payload.CallSid ?? request.id;
      const roomName = `${config.livekitRoomPrefix}${callSid}`;
      const participantIdentity = `${config.livekitSipIdentityPrefix}${callSid}`;
      const agentIdentity = `${config.livekitAgentIdentityPrefix}${callSid}`;

      try {
        await ensureRoomExists(
          {
            roomName,
            metadata: {
              callSid,
              from: payload.From,
              to: payload.To,
            },
          },
          request.log
        );

        const livekitToken = await createAgentAccessToken({
          identity: agentIdentity,
          roomName,
          metadata: {
            callSid,
            role: "agent",
          },
        });

        await startAgentSession(
          {
            callSid,
            roomName,
            participantIdentity,
            livekitToken,
            initialContext: {
              from: payload.From,
              to: payload.To,
              twilio: payload,
            },
          },
          request.log
        );

        const sipHeaders = {
          "X-CallSid": callSid,
          "X-LiveKit-Room": roomName,
          "X-LiveKit-Participant": participantIdentity,
        } satisfies Record<string, string>;

        const callerId = payload.To ?? payload.Called ?? undefined;

        request.log.info(
          {
            callSid,
            roomName,
            participantIdentity,
          },
          "forwarding call to LiveKit"
        );

        reply.header("content-type", "application/xml");
        reply.send(
          buildSipDialResponse({
            sipUri: config.livekitSipUri,
            username: config.livekitSipUsername,
            password: config.livekitSipPassword,
            callerId,
            sipHeaders,
          })
        );
      } catch (error) {
        request.log.error({ err: error, callSid }, "failed to bootstrap LiveKit session");
        const message = buildSayResponse(config.agentFallbackResponse ?? FALLBACK_PROMPT);
        reply.header("content-type", "application/xml");
        reply.send(message);
      }
    }
  );
}

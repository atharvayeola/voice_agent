import { config } from "../config.js";
import { fetchAgentResponse } from "../agent-client.js";
import { buildVoiceResponse } from "../twiml.js";
import { twilioWebhookGuard } from "../security/twilio.js";
const FALLBACK_PROMPT = "I didn't catch that. Please say your question again.";
export function registerTwilioRoutes(app) {
    app.post("/twilio/voice", {
        preHandler: twilioWebhookGuard,
    }, async (request, reply) => {
        const payload = (request.body ?? {});
        const callSid = payload.CallSid ?? request.id;
        const utteranceCandidate = payload.SpeechResult ??
            payload.TranscriptionText ??
            payload.Digits ??
            payload.Body ??
            "";
        const utterance = utteranceCandidate.trim();
        if (!utterance) {
            request.log.warn({ callSid, payload }, "twilio payload missing utterance");
            const message = buildVoiceResponse(FALLBACK_PROMPT);
            reply.header("content-type", "application/xml");
            reply.send(message);
            return;
        }
        const agentResponse = await fetchAgentResponse({
            sessionId: callSid,
            utterance,
            conversation: [],
            metadata: {
                from: payload.From,
                to: payload.To,
                callSid,
            },
        }, request.log);
        const spokenReply = agentResponse.reply.replace(/\s+/g, " ").trim();
        request.log.info({
            callSid,
            from: payload.From,
            usedFallback: agentResponse.usedFallback,
            latencyMs: agentResponse.latencyMs,
        }, "generated agent response");
        reply.header("content-type", "application/xml");
        reply.send(buildVoiceResponse(spokenReply || config.agentFallbackResponse));
    });
}
//# sourceMappingURL=twilio.js.map
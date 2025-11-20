import { Router, type Request, type Response } from "express";
import { performance } from "node:perf_hooks";
import { z } from "zod";

import { callAgent, type AgentRequest } from "../agent-client.js";
import type { Logger } from "../logger.js";
import { publishLatency } from "../metrics.js";
import { SessionCapacityError, SessionStore } from "../session-store.js";
import { synthesizeSpeech } from "../tts-client.js";

const sessionSchema = z.object({
  callSid: z.string().min(1),
  roomName: z.string().min(1),
  participantIdentity: z.string().min(1),
  livekitToken: z.string().min(1),
  initialContext: z.record(z.string(), z.unknown()).optional(),
});

const conversationTurnSchema = z.object({
  role: z.enum(["user", "agent", "system"]),
  content: z.string().min(1),
  timestamp: z.string().datetime().optional(),
});

const utteranceSchema = z.object({
  utterance: z.string().min(1),
  conversation: z.array(conversationTurnSchema).default([]),
  metadata: z.record(z.string(), z.unknown()).optional(),
  voice: z.string().optional(),
  language: z.string().optional(),
});

export function registerSessionRoutes(router: Router, store: SessionStore, logger: Logger) {
  router.post("/api/sessions", (request: Request, response: Response) => {
    const parsed = sessionSchema.safeParse(request.body ?? {});

    if (!parsed.success) {
      logger.warn({ validationError: parsed.error.format() }, "invalid session bootstrap payload");
      response.status(400).json({ error: "invalid_session_payload", details: parsed.error.flatten() });
      return;
    }

    try {
      const session = store.create(parsed.data);
      logger.info({ callSid: session.callSid, roomName: session.roomName }, "session created");
      response.status(202).json({ sessionId: session.id, activeSessions: store.activeCount });
    } catch (error) {
      if (error instanceof SessionCapacityError) {
        logger.warn({ callSid: parsed.data.callSid }, "session capacity reached");
        response.status(429).json({ error: "session_capacity_reached" });
        return;
      }

      throw error;
    }
  });

  router.post("/api/sessions/:id/utterances", async (request: Request, response: Response) => {
    const sessionId = request.params.id;
    const session = store.get(sessionId);

    if (!session) {
      response.status(404).json({ error: "session_not_found" });
      return;
    }

    const parsed = utteranceSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      logger.warn({ validationError: parsed.error.format(), sessionId }, "invalid utterance payload");
      response.status(400).json({ error: "invalid_utterance_payload", details: parsed.error.flatten() });
      return;
    }

    const body = parsed.data;
    const bargeInHandled = store.markUtteranceStart(sessionId);
    const startedAt = performance.now();

    const agentRequest: AgentRequest = {
      sessionId,
      utterance: body.utterance,
      conversation: body.conversation,
      metadata: {
        ...body.metadata,
        bargeInHandled,
        participantIdentity: session.participantIdentity,
        roomName: session.roomName,
        initialContext: session.initialContext,
      },
    };

    let pipelineLatencyMs = 0;
    let ttsMarkedComplete = false;
    let ttsCompletionTimer: NodeJS.Timeout | undefined;
    let qualitySample: ReturnType<typeof store.recordLatency>;

    try {
      const agentResponse = await callAgent(agentRequest, logger);
      await publishLatency(
        {
          sessionId,
          callSid: session.callSid,
          latencyMs: agentResponse.latencyMs,
          stage: "agent",
          bargeInHandled,
          activeSessions: store.activeCount,
        },
        logger
      );

      const ttsResponse = await synthesizeSpeech(
        {
          sessionId,
          text: agentResponse.reply,
          voice: body.voice,
          language: body.language,
          metadata: {
            ...agentResponse,
            bargeInHandled,
          },
        },
        logger
      );

      pipelineLatencyMs = Number((performance.now() - startedAt).toFixed(2));
      store.recordSuccess(sessionId);
      qualitySample = store.recordLatency(sessionId, pipelineLatencyMs);
      await publishLatency(
        {
          sessionId,
          callSid: session.callSid,
          latencyMs: pipelineLatencyMs,
          stage: "pipeline",
          bargeInHandled,
          activeSessions: store.activeCount,
          jitterMs: qualitySample?.jitterMs,
          averageLatencyMs: qualitySample?.averageLatencyMs,
          mos: qualitySample?.mos,
          packetLossRatio: qualitySample?.packetLossRatio,
        },
        logger
      );

      const playbackHoldMs = Math.max(ttsResponse.durationMs ?? 0, 50);
      ttsCompletionTimer = setTimeout(() => {
        store.markTtsComplete(sessionId);
      }, playbackHoldMs);
      ttsMarkedComplete = true;

      response.json({
        sessionId,
        callSid: session.callSid,
        bargeInHandled,
        pipelineLatencyMs,
        agentLatencyMs: agentResponse.latencyMs,
        reply: agentResponse.reply,
        usedFallback: agentResponse.usedFallback,
        citations: agentResponse.citations,
        initialContext: session.initialContext,
        quality: qualitySample,
        tts: {
          voice: ttsResponse.voice,
          language: ttsResponse.language,
          durationMs: ttsResponse.durationMs,
          sampleRate: ttsResponse.sampleRate,
          metadata: ttsResponse.metadata,
        },
      });
    } catch (error) {
      store.recordFailure(sessionId);
      const failureLatency = Number((performance.now() - startedAt).toFixed(2));
      await publishLatency(
        {
          sessionId,
          callSid: session.callSid,
          latencyMs: failureLatency,
          stage: "pipeline",
          bargeInHandled,
          activeSessions: store.activeCount,
          failed: true,
        },
        logger
      );

      logger.error({ err: error, sessionId }, "failed to process utterance");
      response.status(502).json({ error: "utterance_processing_failed" });
    } finally {
      if (!ttsMarkedComplete && ttsCompletionTimer) {
        clearTimeout(ttsCompletionTimer);
      }

      if (!ttsMarkedComplete) {
        store.markTtsComplete(sessionId);
      }
    }
  });

  router.get("/api/sessions/:id", (request: Request, response: Response) => {
    const sessionId = request.params.id;
    const session = store.get(sessionId);

    if (!session) {
      response.status(404).json({ error: "session_not_found" });
      return;
    }

    // Return comprehensive session metrics
    response.json({
      sessionId: session.id,
      callSid: session.callSid,
      roomName: session.roomName,
      participantIdentity: session.participantIdentity,
      createdAt: session.createdAt,
      lastUtteranceAt: session.lastUtteranceAt,
      ttsInFlight: session.ttsInFlight,
      bargeInCount: session.bargeInCount,
      latencyTimeline: session.latencyTimeline,
      lastQualitySample: session.lastQualitySample,
      consecutiveFailures: session.consecutiveFailures,
      totalTurns: session.totalTurns,
      failedTurns: session.failedTurns,
    });
  });

  router.delete("/api/sessions/:id", (request: Request, response: Response) => {
    const sessionId = request.params.id;
    store.delete(sessionId);
    logger.info({ sessionId }, "session terminated");
    response.status(204).send();
  });
}

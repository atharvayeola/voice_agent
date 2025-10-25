import type { FastifyBaseLogger } from "fastify";

import { config } from "./config.js";

interface StartAgentSessionPayload {
  callSid: string;
  roomName: string;
  participantIdentity: string;
  livekitToken: string;
  locale?: string;
  initialContext?: Record<string, unknown>;
}

export async function startAgentSession(payload: StartAgentSessionPayload, logger: FastifyBaseLogger): Promise<void> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.agentRuntimeTimeoutMs);

  try {
    const url = new URL("/api/sessions", config.agentRuntimeUrl);
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`agent runtime returned HTTP ${response.status}`);
    }
  } catch (error) {
    logger.error({ err: error, callSid: payload.callSid }, "failed to start agent session");
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

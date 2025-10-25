import type { Logger } from "./logger.js";
import { config } from "./config.js";
import { requestWithRetry } from "./http-client.js";

export type ConversationRole = "user" | "agent" | "system";

export interface ConversationTurn {
  role: ConversationRole;
  content: string;
  timestamp?: string;
}

export interface AgentRequest {
  sessionId: string;
  utterance: string;
  conversation: ConversationTurn[];
  metadata?: Record<string, unknown> | undefined;
}

export interface AgentCitation {
  id: string;
  title: string;
  score: number;
  sourcePath: string;
  snippet: string;
  metadata: Record<string, unknown>;
}

export interface AgentResponsePayload {
  sessionId: string;
  reply: string;
  citations: AgentCitation[];
  usedFallback: boolean;
  latencyMs: number;
}

export async function callAgent(request: AgentRequest, logger: Logger): Promise<AgentResponsePayload> {
  return requestWithRetry(
    async (signal) => {
      const response = await fetch(new URL("/v1/respond", config.agentServiceUrl), {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(request),
        signal,
      });

      if (!response.ok) {
        throw new Error(`agent service returned HTTP ${response.status}`);
      }

      const payload = (await response.json()) as AgentResponsePayload;
      return payload;
    },
    {
      retries: config.maxRequestRetries,
      timeoutMs: config.requestTimeoutMs,
      logger,
      description: "agent_service",
    }
  ).catch((error) => {
    logger.error({ err: error, sessionId: request.sessionId }, "agent request failed");
    throw error;
  });
}

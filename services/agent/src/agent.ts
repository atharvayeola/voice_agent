import type { FastifyBaseLogger } from "fastify";

import { config } from "./config.js";
import type { AgentRequestPayload } from "./schemas.js";
import { searchKnowledge } from "./knowledge.js";

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

export async function runAgent(
  request: AgentRequestPayload,
  logger: FastifyBaseLogger
): Promise<AgentResponsePayload> {
  const start = performance.now();
  let matches: AgentCitation[] = [];

  try {
    const knowledgeMatches = await searchKnowledge(request.utterance);
    matches = knowledgeMatches.map((match) => ({
      id: match.id,
      title: match.title,
      score: match.score,
      sourcePath: match.sourcePath,
      snippet: buildSnippet(match.content),
      metadata: match.metadata,
    }));
  } catch (error) {
    logger.error({ err: error }, "knowledge lookup failed");
  }

  const usedFallback = matches.length === 0;
  const reply = usedFallback
    ? config.fallbackResponse
    : buildReply(request.utterance, matches);

  const latencyMs = Number((performance.now() - start).toFixed(2));

  await recordLatencyMetric(latencyMs, request.sessionId, logger);

  return {
    sessionId: request.sessionId,
    reply,
    citations: matches,
    usedFallback,
    latencyMs,
  } satisfies AgentResponsePayload;
}

async function recordLatencyMetric(latencyMs: number, sessionId: string, logger: FastifyBaseLogger) {
  if (!config.metricsIngestUrl) {
    return;
  }

  const latencySeconds = Number((latencyMs / 1000).toFixed(3));

  try {
    const response = await fetch(config.metricsIngestUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        latencySeconds,
        metadata: {
          sessionId,
          source: "agent",
        },
      }),
    });

    if (!response.ok) {
      logger.warn({ status: response.status, sessionId }, "failed to record latency metric");
    }
  } catch (error) {
    logger.warn({ err: error, sessionId }, "failed to record latency metric");
  }
}

function buildReply(query: string, citations: AgentCitation[]) {
  const intro = citations.length === 1
    ? "Here’s what I found in our knowledge base:"
    : "Here’s what I found across a few relevant documents:";

  const lines = citations.map((citation) => {
    return `• ${citation.snippet} (source: ${citation.title})`;
  });

  return [intro, ...lines, `Let me know if you need more detail about “${query}”.`].join("\n");
}

function buildSnippet(content: string, maxLength = 280) {
  const normalized = content.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}

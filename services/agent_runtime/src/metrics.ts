import type { Logger } from "./logger.js";
import { config } from "./config.js";

export interface LatencySample {
  sessionId: string;
  callSid: string;
  latencyMs: number;
  stage: "pipeline" | "agent" | "tts";
  bargeInHandled: boolean;
  jitterMs?: number | undefined;
  averageLatencyMs?: number | undefined;
  packetLossRatio?: number | undefined;
  mos?: number | undefined;
  activeSessions?: number | undefined;
  failed?: boolean | undefined;
}

export async function publishLatency(sample: LatencySample, logger: Logger): Promise<void> {
  const latencySeconds = Number((sample.latencyMs / 1000).toFixed(3));

  try {
    const response = await fetch(config.metricsIngestUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        latencySeconds,
        jitterSeconds: typeof sample.jitterMs === "number" ? Number((sample.jitterMs / 1000).toFixed(3)) : undefined,
        packetLossRatio: sample.packetLossRatio,
        mos: sample.mos,
        callFailed: sample.failed === true,
        metadata: {
          sessionId: sample.sessionId,
          callSid: sample.callSid,
          stage: sample.stage,
          bargeInHandled: sample.bargeInHandled,
          latencyTargetMs: config.latencyTargetMs,
          averageLatencyMs: sample.averageLatencyMs,
          jitterMs: sample.jitterMs,
          activeSessions: sample.activeSessions,
        },
      }),
    });

    if (!response.ok) {
      logger.warn({ status: response.status, sample }, "failed to publish latency metric");
    }
  } catch (error) {
    logger.warn({ err: error, sample }, "failed to publish latency metric");
  }
}

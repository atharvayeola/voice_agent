import "dotenv/config";

import Fastify, { type FastifyReply, type FastifyRequest } from "fastify";
import { collectDefaultMetrics, Gauge, Histogram, Registry } from "prom-client";

const SERVICE_NAME = "metrics" as const;
const HOST = process.env.METRICS_HOST ?? process.env.HOST ?? "0.0.0.0";
const PORT = Number.parseInt(process.env.METRICS_PORT ?? process.env.PORT ?? "9105", 10);
const LOG_LEVEL = process.env.LOG_LEVEL ?? "info";

const register = new Registry();
collectDefaultMetrics({ register, prefix: `${SERVICE_NAME}_` });

const agentTurnLatency = new Histogram({
  name: "agent_turn_latency_seconds",
  help: "Latency from speech start to agent response",
  buckets: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.8, 1, 2],
  registers: [register],
});

const callSetupFailures = new Gauge({
  name: "gateway_call_setup_failures_total",
  help: "Number of failed PSTN call setups",
  registers: [register],
});

const mosGauge = new Gauge({
  name: "call_quality_mos",
  help: "Mean Opinion Score Proxy",
  registers: [register],
});

const jitterHistogram = new Histogram({
  name: "call_quality_jitter_seconds",
  help: "Jitter observed over recent pipeline windows",
  buckets: [0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1],
  registers: [register],
});

const packetLossGauge = new Gauge({
  name: "call_quality_packet_loss_ratio",
  help: "Packet loss ratio for active sessions",
  registers: [register],
});

const activeSessionsGauge = new Gauge({
  name: "agent_active_sessions",
  help: "Number of active sessions tracked by the runtime",
  registers: [register],
});

const app = Fastify({ logger: { level: LOG_LEVEL, name: SERVICE_NAME } });

app.get("/healthz", async () => ({ status: "ok" }));

app.get("/metrics", async (_request: FastifyRequest, reply: FastifyReply) => {
  reply.header("Content-Type", register.contentType);
  reply.send(await register.metrics());
});

type TurnIngestPayload = {
  latencySeconds?: number;
  jitterSeconds?: number;
  packetLossRatio?: number;
  mos?: number;
  callFailed?: boolean;
  metadata?: Record<string, unknown>;
};

app.post<{ Body: TurnIngestPayload }>(
  "/ingest/turn",
  async (
    request: FastifyRequest<{ Body: TurnIngestPayload }>,
    reply: FastifyReply
  ) => {
    const { latencySeconds, jitterSeconds, packetLossRatio, mos, callFailed, metadata } =
      request.body ?? {};

    if (typeof latencySeconds === "number") {
      agentTurnLatency.observe(latencySeconds);
    }

    if (typeof jitterSeconds === "number") {
      jitterHistogram.observe(jitterSeconds);
    }

    if (typeof packetLossRatio === "number") {
      packetLossGauge.set(packetLossRatio);
    }

    if (typeof mos === "number") {
      mosGauge.set(mos);
    }

    if (callFailed === true) {
      callSetupFailures.inc();
    }

    const activeSessions = metadata?.activeSessions;
    if (typeof activeSessions === "number" && Number.isFinite(activeSessions)) {
      activeSessionsGauge.set(activeSessions);
    }

    reply.code(202).send({ status: "accepted" });
  }
);

async function main() {
  try {
    await app.listen({ host: HOST, port: PORT });
    app.log.info({ host: HOST, port: PORT }, "metrics service listening");
  } catch (error) {
    app.log.error({ err: error }, "failed to start metrics service");
    process.exit(1);
  }
}

void main();

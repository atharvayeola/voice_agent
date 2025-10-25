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

const app = Fastify({ logger: { level: LOG_LEVEL, name: SERVICE_NAME } });

app.get("/healthz", async () => ({ status: "ok" }));

app.get("/metrics", async (_request: FastifyRequest, reply: FastifyReply) => {
  reply.header("Content-Type", register.contentType);
  reply.send(await register.metrics());
});

type TurnIngestPayload = {
  latencySeconds?: number;
  mos?: number;
  callFailed?: boolean;
};

app.post<{ Body: TurnIngestPayload }>(
  "/ingest/turn",
  async (
    request: FastifyRequest<{ Body: TurnIngestPayload }>,
    reply: FastifyReply
  ) => {
    const { latencySeconds, mos, callFailed } = request.body ?? {};

    if (typeof latencySeconds === "number") {
      agentTurnLatency.observe(latencySeconds);
    }

    if (typeof mos === "number") {
      mosGauge.set(mos);
    }

    if (callFailed === true) {
      callSetupFailures.inc();
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

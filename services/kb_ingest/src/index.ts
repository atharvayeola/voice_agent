import "dotenv/config";

import Fastify from "fastify";

import { config } from "./config.js";
import { hashEmbed } from "@voice-agent/shared";
import { ensureCollection, upsertVector } from "./qdrant.js";
import { ensureSchema, upsertDocument, withPg } from "./storage.js";

const app = Fastify({
  logger: {
    level: config.logLevel,
    name: "kb_ingest",
  },
});

app.get("/healthz", async () => ({ status: "ok" }));

app.post<{
  Body: {
    id: string;
    title: string;
    content: string;
    sourcePath?: string;
    metadata?: Record<string, unknown>;
  };
}>("/ingest", async (request, reply) => {
  const { id, title, content, sourcePath, metadata = {} } = request.body ?? {};

  if (!id || !title || !content) {
    reply.code(400).send({ error: "invalid_payload" });
    return;
  }

  const embeddings = hashEmbed(content, config.embeddingDim);
  const enrichedMetadata = {
    title,
    sourcePath,
    ...metadata,
  };

  await withPg(async (client) => {
    await ensureSchema(client);

    await upsertDocument(client, {
      id,
      title,
      sourcePath: sourcePath ?? "api",
      content,
      metadata: enrichedMetadata,
      embeddings,
    });
  });

  await upsertVector({
    id,
    embeddings,
    payload: enrichedMetadata,
  });

  reply.code(202).send({ status: "accepted" });
});

async function start() {
  try {
    await ensureCollection();
    await withPg(async (client) => ensureSchema(client));
    await app.listen({ host: config.host, port: config.port });
    app.log.info({ host: config.host, port: config.port }, "kb_ingest listening");
  } catch (error) {
    app.log.error({ err: error }, "kb_ingest failed to start");
    process.exit(1);
  }
}

void start();

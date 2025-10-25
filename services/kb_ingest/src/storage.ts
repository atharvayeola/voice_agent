import { Client } from "pg";

import { config } from "./config.js";

export interface KnowledgeDocument {
  id: string;
  title: string;
  sourcePath: string;
  content: string;
  embeddings: number[];
  metadata: Record<string, unknown>;
}

export async function withPg<T>(fn: (client: Client) => Promise<T>) {
  const client = new Client({ connectionString: config.databaseUrl });
  await client.connect();

  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

export async function ensureSchema(client: Client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS knowledge_documents (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      source_path TEXT NOT NULL,
      content TEXT NOT NULL,
      metadata JSONB NOT NULL,
      embeddings DOUBLE PRECISION[] NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await client.query(`
    ALTER TABLE knowledge_documents
    ADD COLUMN IF NOT EXISTS embeddings DOUBLE PRECISION[] NOT NULL DEFAULT '{}';
  `);

  await client.query(`
    ALTER TABLE knowledge_documents
    ALTER COLUMN embeddings DROP DEFAULT;
  `);
}

export async function upsertDocument(client: Client, doc: KnowledgeDocument) {
  await client.query(
    `
      INSERT INTO knowledge_documents (id, title, source_path, content, metadata, embeddings)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        source_path = EXCLUDED.source_path,
        content = EXCLUDED.content,
        metadata = EXCLUDED.metadata,
        embeddings = EXCLUDED.embeddings,
        updated_at = NOW();
    `,
    [
      doc.id,
      doc.title,
      doc.sourcePath,
      doc.content,
      JSON.stringify(doc.metadata),
      doc.embeddings,
    ]
  );
}

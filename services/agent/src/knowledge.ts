import { Pool } from "pg";
import { QdrantClient } from "@qdrant/js-client-rest";

import { hashEmbed } from "@voice-agent/shared";
import { config } from "./config.js";

interface KnowledgeRow {
  id: string;
  title: string;
  source_path: string;
  content: string;
  metadata: unknown;
}

export interface KnowledgeMatch {
  id: string;
  score: number;
  title: string;
  content: string;
  sourcePath: string;
  metadata: Record<string, unknown>;
}

const pool = new Pool({ connectionString: config.databaseUrl });
const qdrant = new QdrantClient({
  url: config.qdrantUrl,
  // Disable compatibility probe to avoid noisy warnings when the server withholds version info.
  checkCompatibility: false,
});

export async function searchKnowledge(query: string): Promise<KnowledgeMatch[]> {
  const embedding = hashEmbed(query, config.embeddingDim);
  let points: Array<{ id: string | number; score?: number }> = [];

  try {
    points = await qdrant.search(config.qdrantCollection, {
      vector: embedding,
      limit: config.maxMatches,
      with_payload: true,
      score_threshold: config.scoreThreshold,
    });
  } catch (error) {
    if ((error as { status?: number }).status === 404) {
      return [];
    }

    throw error;
  }

  if (points.length === 0) {
    return [];
  }

  const ids = points
    .map((point) => (typeof point.id === "string" ? point.id : point.id?.toString()))
    .filter((id): id is string => Boolean(id));

  if (ids.length === 0) {
    return [];
  }

  const { rows } = await pool.query<KnowledgeRow>(
    `SELECT id, title, source_path, content, metadata FROM knowledge_documents WHERE id = ANY($1)`,
    [ids]
  );

  if (rows.length === 0) {
    return [];
  }

  const rowMap = new Map(rows.map((row) => [row.id, row]));

  return points
    .map((point) => {
      const id = typeof point.id === "string" ? point.id : point.id?.toString();
      if (!id) {
        return null;
      }

      const row = rowMap.get(id);
      if (!row) {
        return null;
      }

      const metadata =
        typeof row.metadata === "string"
          ? (JSON.parse(row.metadata) as Record<string, unknown>)
          : (row.metadata as Record<string, unknown> | null) ?? {};

      return {
        id,
        score: typeof point.score === "number" ? point.score : 0,
        title: row.title,
        content: row.content,
        sourcePath: row.source_path,
        metadata,
      } satisfies KnowledgeMatch;
    })
    .filter((match): match is KnowledgeMatch => match !== null);
}

type DependencyHealth = {
  state: "ok" | "missing" | "error";
  detail?: string;
};

export async function knowledgeHealthcheck() {
  const database: DependencyHealth = { state: "ok" };
  const qdrantHealth: DependencyHealth = { state: "ok" };

  try {
    await pool.query("SELECT 1");
  } catch (error) {
    database.state = "error";
    database.detail = (error as Error).message;
  }

  try {
    await qdrant.getCollection(config.qdrantCollection);
  } catch (error) {
    const status = (error as { status?: number }).status;
    if (status === 404) {
      qdrantHealth.state = "missing";
      qdrantHealth.detail = `collection ${config.qdrantCollection} not found`;
    } else {
      qdrantHealth.state = "error";
      qdrantHealth.detail = (error as Error).message;
    }
  }

  return { database, qdrant: qdrantHealth };
}

export async function shutdownKnowledge() {
  await pool.end();
}

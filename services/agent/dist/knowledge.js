import { Pool } from "pg";
import { QdrantClient } from "@qdrant/js-client-rest";
import { hashEmbed } from "@voice-agent/shared";
import { config } from "./config.js";
const pool = new Pool({ connectionString: config.databaseUrl });
const qdrant = new QdrantClient({
    url: config.qdrantUrl,
    // Disable compatibility probe to avoid noisy warnings when the server withholds version info.
    checkCompatibility: false,
});
export async function searchKnowledge(query) {
    const embedding = hashEmbed(query, config.embeddingDim);
    let points = [];
    try {
        points = await qdrant.search(config.qdrantCollection, {
            vector: embedding,
            limit: config.maxMatches,
            with_payload: true,
            score_threshold: config.scoreThreshold,
        });
    }
    catch (error) {
        if (error.status === 404) {
            return [];
        }
        throw error;
    }
    if (points.length === 0) {
        return [];
    }
    const ids = points
        .map((point) => (typeof point.id === "string" ? point.id : point.id?.toString()))
        .filter((id) => Boolean(id));
    if (ids.length === 0) {
        return [];
    }
    const { rows } = await pool.query(`SELECT id, title, source_path, content, metadata FROM knowledge_documents WHERE id = ANY($1)`, [ids]);
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
        const metadata = typeof row.metadata === "string"
            ? JSON.parse(row.metadata)
            : row.metadata ?? {};
        return {
            id,
            score: typeof point.score === "number" ? point.score : 0,
            title: row.title,
            content: row.content,
            sourcePath: row.source_path,
            metadata,
        };
    })
        .filter((match) => match !== null);
}
export async function knowledgeHealthcheck() {
    const database = { state: "ok" };
    const qdrantHealth = { state: "ok" };
    try {
        await pool.query("SELECT 1");
    }
    catch (error) {
        database.state = "error";
        database.detail = error.message;
    }
    try {
        await qdrant.getCollection(config.qdrantCollection);
    }
    catch (error) {
        const status = error.status;
        if (status === 404) {
            qdrantHealth.state = "missing";
            qdrantHealth.detail = `collection ${config.qdrantCollection} not found`;
        }
        else {
            qdrantHealth.state = "error";
            qdrantHealth.detail = error.message;
        }
    }
    return { database, qdrant: qdrantHealth };
}
export async function shutdownKnowledge() {
    await pool.end();
}
//# sourceMappingURL=knowledge.js.map
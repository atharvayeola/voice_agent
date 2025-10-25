import { QdrantClient } from "@qdrant/js-client-rest";
import { config } from "./config.js";
const client = new QdrantClient({ url: config.qdrantUrl });
export async function ensureCollection() {
    try {
        await client.getCollection(config.qdrantCollection);
        return;
    }
    catch (error) {
        if (error.status !== 404) {
            throw error;
        }
    }
    await client.createCollection(config.qdrantCollection, {
        vectors: {
            size: config.embeddingDim,
            distance: "Cosine",
        },
    });
}
export async function upsertVector({ id, embeddings, payload, }) {
    await client.upsert(config.qdrantCollection, {
        wait: true,
        points: [
            {
                id,
                vector: embeddings,
                payload,
            },
        ],
    });
}
//# sourceMappingURL=qdrant.js.map
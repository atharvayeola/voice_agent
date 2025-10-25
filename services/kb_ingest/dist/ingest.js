import "dotenv/config";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "./config.js";
import { hashEmbed } from "@voice-agent/shared";
import { ensureCollection, upsertVector } from "./qdrant.js";
import { ensureSchema, upsertDocument, withPg } from "./storage.js";
const ROOT = path.resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const KB_DIR = path.join(ROOT, "docs", "kb");
async function loadKnowledgeFiles() {
    const entries = await fs.readdir(KB_DIR, { withFileTypes: true });
    const files = entries.filter((entry) => entry.isFile() && entry.name.endsWith(".md"));
    const docs = await Promise.all(files.map(async (file) => {
        const fullPath = path.join(KB_DIR, file.name);
        const content = await fs.readFile(fullPath, "utf8");
        const sourcePath = path.relative(ROOT, fullPath);
        const id = crypto.createHash("sha256").update(sourcePath).digest("hex");
        return {
            id,
            title: path.basename(file.name, ".md"),
            sourcePath,
            content,
        };
    }));
    if (docs.length === 0) {
        throw new Error(`No markdown files found in ${KB_DIR}`);
    }
    return docs;
}
async function main() {
    console.log(`[kb_ingest] Loading documents from ${KB_DIR}`);
    const documents = await loadKnowledgeFiles();
    await ensureCollection();
    await withPg(async (client) => {
        await ensureSchema(client);
        for (const doc of documents) {
            const embeddings = hashEmbed(doc.content, config.embeddingDim);
            const metadata = {
                title: doc.title,
                sourcePath: doc.sourcePath,
                checksum: crypto.createHash("sha256").update(doc.content).digest("hex"),
            };
            await upsertDocument(client, {
                id: doc.id,
                title: doc.title,
                sourcePath: doc.sourcePath,
                content: doc.content,
                embeddings,
                metadata,
            });
            await upsertVector({
                id: doc.id,
                embeddings,
                payload: metadata,
            });
            console.log(`[kb_ingest] Upserted ${doc.title}`);
        }
    });
    console.log(`[kb_ingest] Ingestion complete`);
}
main().catch((error) => {
    console.error(`[kb_ingest] Ingestion failed`, error);
    process.exit(1);
});
//# sourceMappingURL=ingest.js.map
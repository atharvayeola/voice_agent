# Knowledge Base Ingest Service

Transforms documents into embeddings and populates vector + relational stores.

## Current Capabilities
- Fastify API exposing `/ingest` for programmatic document upserts.
- Deterministic hash-based embeddings written to Qdrant (default collection `voice_agent_kb`).
- Postgres persistence of document content + metadata.
- CLI seeding script (`pnpm --filter @voice-agent/kb-ingest seed`) that ingests markdown files from `docs/kb`.

## Configuration
- `DATABASE_URL` — Postgres connection string (defaults to local dev instance).
- `QDRANT_URL` — Qdrant endpoint (defaults to local docker compose service).
- `QDRANT_COLLECTION` — Collection name (defaults to `voice_agent_kb`).
- `EMBEDDING_DIM` — Dimension of the generated embeddings (default `256`).

## Next Steps
1. Replace hash embeddings with vendor-backed embeddings (OpenAI/Vertex/Azure).
2. Introduce document chunking + metadata enrichment pipeline.
3. Add ingestion back-pressure and job queue for large document sets.
4. Provide retrieval API for the agent service (top-k search, filters).

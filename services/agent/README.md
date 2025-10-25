# Agent Service

Responsible for orchestrating dialog policy, RAG lookups, and tool calls.

## Roadmap

## Running Locally

```bash
pnpm --filter @voice-agent/agent dev
```

The service listens on `localhost:9102` by default. Override with `AGENT_HOST` / `AGENT_PORT`.

Required dependencies:
- Postgres database with the `knowledge_documents` table (ingested via `@voice-agent/kb-ingest`).
- Qdrant collection containing embeddings for the knowledge documents.

## API

- `POST /v1/respond`
	- Request body:
		```json
		{
			"sessionId": "call-123",
			"utterance": "What is the refund policy?",
			"conversation": [
				{ "role": "system", "content": "You are a helpful agent." }
			]
		}
		```
	- Response body (example):
		```json
		{
			"sessionId": "call-123",
			"reply": "Here’s what I found in our knowledge base:\n• Refunds are offered within 30 days of purchase if items are unused (source: refund_policy)\nLet me know if you need more detail about “What is the refund policy?”.",
			"citations": [
				{
					"id": "…",
					"title": "refund_policy",
					"score": 0.76,
					"sourcePath": "docs/kb/refund_policy.md",
					"snippet": "Refunds are offered within 30 days…",
					"metadata": {
						"title": "refund_policy",
						"sourcePath": "docs/kb/refund_policy.md"
					}
				}
			],
			"usedFallback": false,
			"latencyMs": 42.6
		}
		```

## Current Status
- Fastify HTTP service with `/v1/respond` endpoint returning citation-backed answers.
- Deterministic embedding search via Qdrant + Postgres knowledge base.
- Configurable fallback response when the knowledge base has no matches.

# Voice Agent Platform (Roadmap 2025)

Greenfield implementation of a production-ready voice AI agent that sustains 100 concurrent PSTN calls with sub-600 ms round-trip latency, reliable barge-in, and full observability.

## Repository Layout
- `infra/`
   - `docker-compose.yml` — developer stack (LiveKit, Qdrant, Postgres, Prometheus, Grafana, Loki, Jaeger, Otel Collector).
   - `k8s/` — Kustomize/Helm-ready manifests for gateway, agent, STT, TTS, observability bundle, and data services.
   - `terraform/` — optional cloud + Twilio infrastructure modules.
- `services/`
   - `gateway/` — PSTN ingress, Twilio webhooks, LiveKit orchestration, call control.
   - `agent/` — dialog manager (scripted + LLM), RAG integration, policy enforcement.
   - `stt/` — streaming speech-to-text adapter with VAD, partials, and latency metrics.
   - `tts/` — low-latency text-to-speech streaming with barge-in aware playback.
   - `kb_ingest/` — document ingestion, embeddings, and Qdrant writers.
   - `metrics/` — MOS estimators, RTCP collectors, custom Prometheus exporters.
- `clients/`
   - `load/sipp/` — SIPp scenarios for synthetic PSTN load tests (5-call smoke, 100-call soak).
   - `load/twilio/` — bulk dialing scripts for Twilio Programmable Voice.
- `observability/`
   - Prometheus, Grafana, Loki dashboards/configs, and Otel collector defaults.
- `scripts/`
   - Automation for dev bootstrap, demo runs, knowledge-base seeding, and load orchestration.
- `docs/`
   - Architecture, call flow, scaling plan, LiveKit vs Pipecat analysis, runbooks, and recorded results.

## Getting Started
1. Install prerequisites: `docker`, `docker compose`, `node >= 20`, `python >= 3.11`, `kubectl`, `helm`.
2. Copy `.env.example` to `.env` and provide vendor credentials (Twilio, LiveKit, STT/TTS, OpenAI) or fallback paths.
3. Run `./scripts/dev_bootstrap.sh` to pull base images, prime Compose volumes, and install tooling hooks.
4. Launch the developer stack: `docker compose -f infra/docker-compose.yml up -d gateway` to start the gateway against the shared infra. Add other services (agent, stt, tts, kb_ingest, metrics) as their implementations solidify.
5. Seed the knowledge base locally with `pnpm --filter @voice-agent/kb-ingest seed` (requires Postgres + Qdrant from Compose).
6. Start the agent alongside the gateway: `docker compose -f infra/docker-compose.yml up -d agent` (or run both via `pnpm --filter @voice-agent/agent dev` and `pnpm --filter @voice-agent/gateway dev`).
7. Run the HTTP smoke test once services are live: `pnpm smoke:gateway`. The script exercises the Twilio webhook end-to-end and prints latency plus the spoken reply.
8. Follow service-specific READMEs under `services/` to run gateway, agent, STT, TTS components locally or in Kubernetes.

## Roadmap (High-Level)
1. **Phase A – Foundations:** repo scaffold, dev containers, observability stack, secret templates.
2. **Phase B – Telephony & Media:** LiveKit deployment, Twilio gateways, RTCP metrics, barge-in plumbing.
3. **Phase C – STT/Agent/TTS:** streaming adapters, dialog policy, RAG integration, latency budgeting.
4. **Phase D – Observability:** Prometheus/Grafana dashboards, OpenTelemetry spans, MOS estimator.
5. **Phase E – Scale & Resilience:** autoscaling, failover, circuit breakers, Kubernetes hardening.
6. **Phase F – Load & Demo:** SIPp/Twilio load generation, 100-call soak, demo recording, report packaging.

## Contributing
The repo targets a PR-driven workflow with pre-commit hooks and CI jobs (lint, unit, integration, load smoke). See `docs/runbook.md` for branching, testing, and deployment guidance.

---
© 2025 Voice Agent Platform. All rights reserved.

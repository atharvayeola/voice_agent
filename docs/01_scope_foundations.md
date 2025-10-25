# Scope & Foundations

## Problem Statement
Design and deploy a production-grade voice AI agent capable of serving 100 concurrent PSTN callers with near real-time responsiveness (<600 ms speech-response round trip), robust voice UX (barge-in, turn-taking), high availability, and rich observability.

## Requirements Summary
- **Telephony**: Accept inbound PSTN calls via SIP trunk, bridge into a real-time media fabric (LiveKit SFU).
- **Conversational Agent**: Duplex audio pipeline with STT → dialog manager → TTS; support barge-in, scripted and LLM-driven flows, objection handling.
- **Latency**: <600 ms average end-to-end per turn across 100 calls; instrument speech → STT → LLM → TTS path.
- **Observability**: Capture MOS proxies (jitter, packet loss, RTT), agent latency (avg, P95), call setup failure rate, error budgets.
- **Scalability**: Horizontal scale from 1 to 100+ concurrent calls; resilient to component failures, include automatic recovery
  (agent respawn, media reconnection).
- **Knowledge**: Embed vector/keyword store for FAQ responses and objection handling with traceability.
- **Deliverables**: Infrastructure scripts, production deploy manifests, diagrams, trade-off analysis (LiveKit vs Pipecat), runbooks/demo automation.

## Core Technical Decisions
| Layer | Choice | Rationale |
| --- | --- | --- |
| PSTN Ingress | Twilio Elastic SIP Trunk | Global PSTN coverage, elastic scaling, SIP Inbound <-> WebRTC bridging support. |
| SIP Gateway → Media | LiveKit SIP Ingress | Managed SIP → LiveKit room bridge, low-latency SFU, call session lifecycle hooks. |
| Media Fabric | LiveKit Cloud / self-hosted cluster | Proven for low-latency bi-directional audio, supports server-side agents and WebRTC scaling. |
| Agent Runtime | LiveKit Agent SDK (Node/TypeScript) + Realtime LLM | Tight integration with LiveKit rooms, simplifies barge-in / stream control. |
| STT | Deepgram Nova-2 Streaming | Sub-150 ms streaming transcription, diarization support, scalable pricing. |
| TTS | OpenAI Realtime Voice (or ElevenLabs Realtime fallback) | Fast streaming synthesis with barge-in cancellation APIs. |
| LLM Dialog | OpenAI GPT-4.1 Realtime API (script + policy layer) | Low-latency multi-turn dialog, tool calling for KB lookup & state. |
| Knowledge Store | PostgreSQL + pgvector (managed, e.g., Neon) | Simple managed vector DB with SQL semantics, horizontal read scaling. |
| Orchestration | Kubernetes (GKE Autopilot or k3s) | Simplifies horizontal autoscaling, rolling updates, failure domains. |
| Observability | Prometheus + Grafana + Tempo + Loki stack | Unified metrics, tracing, logs; existing exporters for SIP, WebRTC, k8s. |
| Load Testing | SIPp + LiveKit synthetic client harness | Reproducible PSTN load simulation, media + agent stress tests. |

### Key Open Items / Assumptions
- Deepgram quota and OpenAI realtime quotas available for 100 concurrent streams.
- LiveKit SIP ingress licensed or self-hosted; confirm capacity planning for 100 rooms. 
- Kubernetes deployment target assumed GKE; adapt manifests for alternative cloud if needed.

## Latency Budget (Target <600 ms average per turn)
| Stage | Budget | Notes |
| --- | --- | --- |
| Caller speech capture & RTP delivery | 60 ms | Assuming Twilio → LiveKit SIP ingress with direct media peering. |
| STT streaming partial hypothesis | 120 ms | Deepgram partial results at 80-100 ms under load. |
| Dialog policy & LLM reasoning | 220 ms | GPT-4.1 realtime with prompt caching & function calling. |
| TTS synthesis start | 120 ms | OpenAI Realtime voice start-of-speech <100 ms, budget includes barge-in cancellation. |
| Media egress to caller | 60 ms | LiveKit SFU <30 ms + PSTN leg jitter buffer. |
| **Total** | **580 ms** | 20 ms buffer for jitter / retries. |

## Resilience & Scaling Targets
- **Call-level**: Auto-reconnect LiveKit participants on SFU node failure (<3 s). Retry policy for STT/TTS streams (exponential backoff, hot spare providers).
- **Service-level**: Each pipeline component stateless (except session storage); scale via HPA (CPU + custom latency metric). Minimum 3 replicas per critical service (agent worker, signaling gateway).
- **Data**: Knowledge base multi-AZ with PITR; nightly QA dataset refresh pipeline.
- **Failover**: Warm standby region with DNS failover; for MVP demonstrate worker restart and SIP re-invite recovery.

## Observability Plan
- **Metrics**: Export Prometheus metrics for call setup time, STT latency, LLM latency (avg/P95), TTS latency, end-to-end latency, barge-in rate, MOS proxy (E-model via RTCP stats), packet loss, jitter.
- **Traces**: OpenTelemetry spans per call turn; correlate SIP INVITE through agent pipeline.
- **Logs**: Structured JSON logs with session IDs; integrate Loki for live tail/retention.
- **Dashboards**: Caller QoS (MOS, jitter), Agent Performance (latency percentiles), Reliability (retry counts, failures), Capacity (calls in progress vs limit).
- **Alerts**: PagerDuty triggers for latency >750 ms sustained, call setup failure rate >2%, MOS <3.8, worker crash loops.

## Test Harness Strategy
- **Functional**: Playwright-based automated call flows (Twilio testing tools) verifying dialog scripts and KB answers.
- **Load**: SIPp scenario script simulating 10/50/100 concurrent calls with recorded utterances; LiveKit load harness for WebRTC legs.
- **Chaos**: Inject SIP node failure, STT provider outage, and packet loss scenarios using `tc` or LiveKit network emulation.
- **Regression**: CI pipeline running unit/integration tests, plus nightly load smoke (10 concurrent calls) with automated report ingestion into Grafana.

## Documentation & Compliance
- Architecture ADRs stored in `docs/adr/` (future). Maintain runbooks for incident response, call tracing, and vendor failover.
- Security: SIP/TLS, SRTP between LiveKit and agents, secrets via HashiCorp Vault or k8s secrets (sealed secrets for git storage).
- Compliance considerations: Call recording policies, PII handling, GDPR deletion workflow (pending design).

## Next Steps
1. Prepare repo scaffolding (services folders, infrastructure directory, CI skeleton).
2. Create initial architecture diagram drafts (system & call flow).
3. Begin telephony ingress implementation: Twilio SIP configuration + LiveKit SIP ingress prototype.
4. Stand up baseline observability stack manifests.

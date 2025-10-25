# Incident Response Runbook

## 1. High Latency (>600 ms round-trip)
1. Check Grafana "Voice Agent Overview" dashboard for spikes in `agent_turn_latency_seconds` and `gateway_call_setup_seconds`.
2. Inspect Prometheus query for STT/LLM/TTS latency breakdown to isolate stage causing regression.
3. Verify Deepgram/OpenAI provider status dashboards; fail over to backup provider if primary degraded.
4. Scale the agent deployment (`kubectl scale deploy/agent --replicas=<n>`). Ensure autoscaler metrics target <70% CPU.
5. Review LiveKit node health (packet loss, jitter). If congested, add nodes via Terraform (`module.gke.max_nodes`) or shift traffic to alternate region.

## 2. Elevated Call Setup Failures (>2%)
1. Check gateway logs (`kubectl logs deploy/gateway`).
2. Confirm Twilio webhook validation success rate; inspect signature mismatches.
3. Verify Redis availability (session store). If down, sessions fallback to in-memory; restart Redis via Terraform or cloud console.
4. Ensure LiveKit SIP ingress reachable; check LiveKit admin console for SIP errors.

## 3. Agent Runtime Crash Loop
1. `kubectl describe pod` to inspect container logs; search for unhandled exceptions.
2. If failing on config parse, confirm Kubernetes secrets contain required env vars (OpenAI keys, Deepgram keys).
3. For persistent crash, roll back to previous image (`kubectl rollout undo deploy/agent`).
4. Investigate high memory usage; adjust resource limits in Kustomize overlay and redeploy.

## 4. LiveKit Node Failure
1. Use LiveKit observability (Grafana or admin API) to identify unhealthy nodes.
2. Trigger agent runtime session restart by POSTing `/api/sessions/:callSid/end` to ensure cleanup.
3. Terraform plan/apply to add replacement nodes or switch to standby region.

## 5. Knowledge Base Drift / Incorrect Answers
1. Re-run knowledge seeding script `pnpm --filter @voice-agent/kb-ingest run seed` after updating `data/`.
2. Check `kb_ingest_queries_total{status="error"}` for ingestion/query issues.
3. Validate embeddings table in Postgres using `SELECT COUNT(*) FROM knowledge_documents`.
4. If vector search inaccurate, re-embed documents using latest model; purge stale entries.

### Escalation
- Page on-call via PagerDuty if latency >750 ms for >5 minutes or call setup failure rate >5%.
- Escalate to vendor support for Twilio/LiveKit outages beyond internal control.

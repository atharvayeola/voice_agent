# Metrics Service

Aggregates call quality analytics (MOS), RTCP stats, and custom service metrics.

## Current Capabilities
- Fastify HTTP service exposing `/metrics` (Prometheus format) and `/healthz`.
- `/ingest/turn` endpoint accepts latency, MOS, and failure signals to update gauges/histograms.
- Default Prometheus metrics registered for process/node telemetry.

## Next Steps
1. Wire LiveKit RTCP feeds and gateway events into the ingestion endpoint.
2. Derive MOS via E-model calculations before emitting to Prometheus.
3. Add OTLP exporters once spans are available from the gateway/agent services.

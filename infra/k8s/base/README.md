# Kubernetes Base Manifests

This directory will host the shared manifests for the refreshed service lineup:
- Namespace defaults and shared ConfigMaps/Secrets templates.
- Deployments and Services for `gateway`, `agent`, `stt`, `tts`, `kb-ingest`, and `metrics`.
- Observability bundle (Prometheus, Grafana, Tempo, Loki, Otel collector) once productionized.

Overlays in `infra/k8s/overlays/` will tailor environments (dev, staging, prod) with replica counts, resource limits, and feature flags. The legacy manifests have been removed; new definitions will be added incrementally.

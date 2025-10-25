# Scripts

Bootstrap and automation helpers live here.

## Available
- `dev_bootstrap.sh` — provisions the Python virtualenv + nodeenv combo used across services.
- `run_gateway_smoke.mjs` — posts a Twilio-style webhook to the local gateway and validates the spoken response.

## Planned
- `provision_infra.sh` — wrappers for Terraform targets (dev/staging/prod).
- `deploy_services.sh` — apply k8s manifests via kustomize overlays.
- `run_load_test.sh` — orchestrate SIPp + Twilio bulk dial scenarios.

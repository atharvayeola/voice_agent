# Terraform Infrastructure

Terraform modules for provisioning shared infrastructure:
- Networking (VPC, subnets, NAT)
- GKE cluster for workloads (or alternative orchestrator)
- Managed Postgres (pgvector)
- LiveKit deployment targets (self-hosted) or integration secrets
- Observability stack (Prometheus, Grafana, Loki, Tempo)

Modules will be split into:
- `providers/` — cloud provider configuration
- `modules/` — reusable modules (network, gke, database)
- `envs/` — environment-specific stacks (dev, staging, prod)

## Usage
1. Activate the project virtual environment (`source .venv/bin/activate`).
2. Change into the environment directory, e.g. `infra/terraform/envs/dev`.
3. Initialize Terraform:
	```bash
	terraform init -backend-config="bucket=<your-state-bucket>"
	```
4. Provide required variables either via `terraform.tfvars` (do **not** commit secrets) or CLI flags:
	```bash
	terraform apply -var "project_id=voice-agent-dev" -var "postgres_password=$(op read secret)"
	```

State for staging/prod is configured to use GCS buckets; ensure the bucket exists prior to running `terraform init`.

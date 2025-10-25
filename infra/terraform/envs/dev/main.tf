terraform {
  backend "local" {}
}

module "network" {
  source = "../../modules/network"

  name = "voice-agent-dev"
  subnets = {
    primary = {
      name   = "voice-agent-dev-main"
      cidr   = "10.20.0.0/20"
      region = var.region
    }
  }
}

module "gke" {
  source = "../../modules/gke"

  project_id = var.project_id
  name       = "voice-agent-dev"
  location   = var.region
  network    = module.network.network_id
  subnetwork = module.network.subnet_ids["primary"]

  node_machine_type = "e2-standard-4"
  min_nodes         = 1
  max_nodes         = 4
}

module "postgres" {
  source = "../../modules/postgres"

  instance_name       = "voice-agent-dev-db"
  region              = var.region
  password            = var.postgres_password
  deletion_protection = false
  tier                = "db-custom-1-3840"
}

module "redis" {
  source = "../../modules/redis"

  name           = "voice-agent-dev-redis"
  region         = var.region
  memory_size_gb = 4
}

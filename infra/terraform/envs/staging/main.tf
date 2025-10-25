terraform {
  backend "gcs" {
    bucket = "voice-agent-terraform"
    prefix = "staging"
  }
}

module "network" {
  source = "../../modules/network"

  name = "voice-agent-staging"
  subnets = {
    primary = {
      name   = "voice-agent-staging-main"
      cidr   = "10.10.0.0/20"
      region = var.region
    }
  }
}

module "gke" {
  source = "../../modules/gke"

  project_id = var.project_id
  name       = "voice-agent-staging"
  location   = var.region
  network    = module.network.network_id
  subnetwork = module.network.subnet_ids["primary"]

  node_machine_type = "c2-standard-8"
  min_nodes         = 3
  max_nodes         = 12

  node_labels = {
    environment = "staging"
  }
}

module "postgres" {
  source = "../../modules/postgres"

  instance_name       = "voice-agent-staging-db"
  region              = var.region
  password            = var.postgres_password
  deletion_protection = false
}

module "redis" {
  source = "../../modules/redis"

  name           = "voice-agent-staging-redis"
  region         = var.region
  memory_size_gb = 8
}

output "redis_connection" {
  value = "redis://${module.redis.host}:${module.redis.port}"
}

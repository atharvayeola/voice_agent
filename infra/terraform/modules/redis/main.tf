resource "google_redis_instance" "primary" {
  name           = var.name
  tier           = var.tier
  memory_size_gb = var.memory_size_gb
  region         = var.region
  transit_encryption_mode = "SERVER_AUTHENTICATION"
}

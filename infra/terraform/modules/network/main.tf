resource "google_compute_network" "primary" {
  name                    = var.name
  auto_create_subnetworks = false
}

resource "google_compute_subnetwork" "subnets" {
  for_each      = var.subnets
  name          = each.value.name
  ip_cidr_range = each.value.cidr
  region        = each.value.region
  network       = google_compute_network.primary.id
}

output "network_id" {
  value = google_compute_network.primary.id
}

output "subnet_ids" {
  value = { for k, subnet in google_compute_subnetwork.subnets : k => subnet.id }
}

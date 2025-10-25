resource "google_container_cluster" "primary" {
  name     = var.name
  location = var.location

  network    = var.network
  subnetwork = var.subnetwork

  remove_default_node_pool = true
  initial_node_count        = 1

  release_channel {
    channel = "REGULAR"
  }

  workload_identity_config {
    workload_pool = "${var.project_id}.svc.id.goog"
  }

  ip_allocation_policy {}
}

resource "google_container_node_pool" "default" {
  name       = "${var.name}-pool"
  location   = var.location
  cluster    = google_container_cluster.primary.name

  node_config {
    machine_type = var.node_machine_type
    oauth_scopes = [
      "https://www.googleapis.com/auth/cloud-platform"
    ]
    tags = var.node_tags
    labels = var.node_labels
  }

  autoscaling {
    min_node_count = var.min_nodes
    max_node_count = var.max_nodes
  }
}

resource "google_sql_database_instance" "primary" {
  name             = var.instance_name
  database_version = "POSTGRES_15"
  region           = var.region

  settings {
    tier = var.tier

    backup_configuration {
      enabled                        = true
      point_in_time_recovery_enabled = true
    }

    maintenance_window {
      day          = 7
      hour         = 3
      update_track = "stable"
    }
  }

  deletion_protection = var.deletion_protection
}

resource "google_sql_database" "db" {
  name     = var.database_name
  instance = google_sql_database_instance.primary.name
}

resource "google_sql_user" "db_user" {
  name     = var.username
  instance = google_sql_database_instance.primary.name
  password = var.password
}

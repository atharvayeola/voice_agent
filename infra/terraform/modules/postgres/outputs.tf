output "connection_name" {
  value = google_sql_database_instance.primary.connection_name
}

output "instance_self_link" {
  value = google_sql_database_instance.primary.self_link
}

output "database_name" {
  value = google_sql_database.db.name
}

output "username" {
  value = google_sql_user.db_user.name
}

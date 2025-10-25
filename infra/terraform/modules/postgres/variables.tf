variable "instance_name" {
  type = string
}

variable "region" {
  type = string
}

variable "tier" {
  type    = string
  default = "db-custom-2-7680"
}

variable "database_name" {
  type    = string
  default = "voice_agent"
}

variable "username" {
  type    = string
  default = "voice_agent"
}

variable "password" {
  type      = string
  sensitive = true
}

variable "deletion_protection" {
  type    = bool
  default = true
}

variable "name" {
  type = string
}

variable "tier" {
  type    = string
  default = "STANDARD_HA"
}

variable "memory_size_gb" {
  type    = number
  default = 4
}

variable "region" {
  type = string
}

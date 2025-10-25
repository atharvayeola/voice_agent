variable "project_id" {
  type = string
}

variable "name" {
  type = string
}

variable "location" {
  type = string
}

variable "network" {
  type = string
}

variable "subnetwork" {
  type = string
}

variable "node_machine_type" {
  type    = string
  default = "e2-standard-4"
}

variable "min_nodes" {
  type    = number
  default = 1
}

variable "max_nodes" {
  type    = number
  default = 10
}

variable "node_tags" {
  type    = list(string)
  default = []
}

variable "node_labels" {
  type    = map(string)
  default = {}
}

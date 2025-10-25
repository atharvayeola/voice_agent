variable "name" {
  description = "VPC name"
  type        = string
}

variable "subnets" {
  description = "Map of subnets"
  type = map(object({
    name   = string
    cidr   = string
    region = string
  }))
}

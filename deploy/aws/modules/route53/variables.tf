variable "domain_name" {
  description = "Apex domain for the deployment (e.g. tidyboard.org). A record for this name and for www.<domain> are created."
  type        = string
}

variable "zone_id" {
  description = "Route 53 hosted zone ID for the apex domain. Zone must be pre-created."
  type        = string
}

variable "eip_address" {
  description = "IPv4 address of the Elastic IP attached to the Tidyboard EC2. Both apex and www A records point here."
  type        = string
}

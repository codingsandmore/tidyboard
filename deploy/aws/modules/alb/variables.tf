variable "project" {
  description = "Project name prefix."
  type        = string
}

variable "environment" {
  description = "Deployment environment."
  type        = string
}

variable "vpc_id" {
  description = "VPC ID."
  type        = string
}

variable "public_subnets" {
  description = "Public subnet IDs for the ALB."
  type        = list(string)
}

variable "domain_name" {
  description = "Domain name — used as the ACM certificate domain."
  type        = string
}

variable "certificate_arn" {
  description = "ACM certificate ARN for HTTPS. Self-referential: the ALB module creates the cert and references it in the HTTPS listener."
  type        = string
  default     = ""
}

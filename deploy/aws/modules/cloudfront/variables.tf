variable "project" {
  description = "Project name prefix."
  type        = string
}

variable "environment" {
  description = "Deployment environment."
  type        = string
}

variable "domain_name" {
  description = "Primary domain name for the CloudFront distribution."
  type        = string
}

variable "alb_dns" {
  description = "ALB DNS name — used as the CloudFront origin."
  type        = string
}

variable "price_class" {
  description = "CloudFront price class. PriceClass_100 = US/Canada/Europe (cheapest)."
  type        = string
  default     = "PriceClass_100"
}

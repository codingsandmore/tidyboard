variable "domain_name" {
  description = "Root domain name."
  type        = string
}

variable "zone_id" {
  description = "Route 53 hosted zone ID."
  type        = string
}

variable "cloudfront_domain" {
  description = "CloudFront distribution domain name."
  type        = string
}

variable "cloudfront_hosted_zone_id" {
  description = "CloudFront hosted zone ID (for Route 53 alias records)."
  type        = string
}

variable "alb_dns" {
  description = "ALB DNS name."
  type        = string
}

variable "alb_zone_id" {
  description = "ALB Route 53 hosted zone ID."
  type        = string
}

variable "acm_validation_records" {
  description = "ACM certificate DNS validation records from the cloudfront module."
  type = map(object({
    name  = string
    type  = string
    value = string
  }))
  default = {}
}

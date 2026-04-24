# ── AWS provider settings ─────────────────────────────────────────────────────

variable "aws_profile" {
  description = "AWS named profile from ~/.aws/credentials used for all API calls. Never hardcode keys."
  type        = string
  default     = "tidyboard"
}

variable "aws_region" {
  description = "AWS region where the stack is deployed."
  type        = string
  default     = "us-east-1"
}

# ── Naming / tagging ──────────────────────────────────────────────────────────

variable "project" {
  description = "Short project name used as a prefix on all resource names."
  type        = string
  default     = "tidyboard"
}

variable "environment" {
  description = "Deployment environment (prod, staging, dev)."
  type        = string
  default     = "prod"
}

# ── Domain ────────────────────────────────────────────────────────────────────

variable "domain_name" {
  description = "Root domain name for the deployment, e.g. tidyboard.example.com. Required for TLS certificates."
  type        = string
}

variable "create_route53_records" {
  description = "When true, create Route 53 DNS records pointing to CloudFront and the ALB. Set to false if you manage DNS externally."
  type        = bool
  default     = false
}

variable "route53_zone_id" {
  description = "Route 53 hosted zone ID. Required when create_route53_records = true."
  type        = string
  default     = ""
}

# ── Database (shared cutly-db instance) ───────────────────────────────────────

variable "db_host" {
  description = "Endpoint of the existing Postgres RDS instance to share."
  type        = string
  default     = "cutly-db.c858qwm0sac7.us-east-1.rds.amazonaws.com"
}

variable "db_port" {
  description = "Port of the existing Postgres instance."
  type        = number
  default     = 5432
}

variable "db_security_group_id" {
  description = "Security group attached to the existing RDS instance (ingress 5432 allowed from Tidyboard ECS)."
  type        = string
  default     = "sg-001c4c1a130b6ab42"
}

variable "existing_vpc_id" {
  description = "VPC hosting the shared Postgres. Tidyboard ECS runs in this VPC instead of creating a new one."
  type        = string
  default     = "vpc-0c41d6012793ea910"
}

variable "db_name" {
  description = "PostgreSQL database name inside the shared instance."
  type        = string
  default     = "cutly"
}

variable "db_username" {
  description = "PostgreSQL role for Tidyboard (created by bootstrap-db.sh)."
  type        = string
  default     = "tidyboard"
}

variable "db_schema" {
  description = "Postgres schema for Tidyboard tables inside the shared DB."
  type        = string
  default     = "tidyboard"
}

# ── ECS desired task counts ───────────────────────────────────────────────────

variable "ecs_desired_count_server" {
  description = "Desired number of Go server ECS tasks."
  type        = number
  default     = 1
}

variable "ecs_desired_count_web" {
  description = "Desired number of Next.js web ECS tasks."
  type        = number
  default     = 1
}

variable "ecs_desired_count_sync" {
  description = "Desired number of Python sync-worker ECS tasks."
  type        = number
  default     = 1
}

variable "ecs_desired_count_scraper" {
  description = "Desired number of Python recipe-scraper ECS tasks."
  type        = number
  default     = 1
}

# ── Container CPU / memory ────────────────────────────────────────────────────

variable "server_cpu" {
  description = "CPU units for the Go server task (1024 = 1 vCPU)."
  type        = number
  default     = 512
}

variable "server_memory" {
  description = "Memory (MiB) for the Go server task."
  type        = number
  default     = 1024
}

variable "web_cpu" {
  description = "CPU units for the Next.js web task."
  type        = number
  default     = 512
}

variable "web_memory" {
  description = "Memory (MiB) for the Next.js web task."
  type        = number
  default     = 1024
}

variable "sync_cpu" {
  description = "CPU units for the sync-worker task."
  type        = number
  default     = 256
}

variable "sync_memory" {
  description = "Memory (MiB) for the sync-worker task."
  type        = number
  default     = 512
}

variable "scraper_cpu" {
  description = "CPU units for the recipe-scraper task."
  type        = number
  default     = 256
}

variable "scraper_memory" {
  description = "Memory (MiB) for the recipe-scraper task."
  type        = number
  default     = 512
}

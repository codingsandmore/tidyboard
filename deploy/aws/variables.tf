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

# ── Database ──────────────────────────────────────────────────────────────────

variable "db_min_capacity" {
  description = "Aurora Serverless v2 minimum ACU (0.5 = cheapest; costs ~$0.06/hour when active)."
  type        = number
  default     = 0.5
}

variable "db_max_capacity" {
  description = "Aurora Serverless v2 maximum ACU."
  type        = number
  default     = 4
}

variable "db_name" {
  description = "PostgreSQL database name."
  type        = string
  default     = "tidyboard"
}

variable "db_username" {
  description = "PostgreSQL master username."
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

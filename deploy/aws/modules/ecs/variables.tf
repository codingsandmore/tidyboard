variable "project" {
  description = "Project name prefix."
  type        = string
}

variable "environment" {
  description = "Deployment environment."
  type        = string
}

variable "aws_region" {
  description = "AWS region."
  type        = string
}

variable "account_id" {
  description = "AWS account ID."
  type        = string
}

variable "vpc_id" {
  description = "VPC ID."
  type        = string
}

variable "private_subnets" {
  description = "Private subnet IDs for ECS tasks."
  type        = list(string)
}

variable "alb_sg_id" {
  description = "ALB security group ID — ECS tasks accept traffic from it."
  type        = string
}

# ── IAM roles ─────────────────────────────────────────────────────────────────

variable "execution_role_arn" {
  description = "ECS task execution role ARN."
  type        = string
}

variable "task_role_arn" {
  description = "ECS task role ARN."
  type        = string
}

# ── ECR image URIs ────────────────────────────────────────────────────────────

variable "server_image" {
  description = "ECR image URI for the Go server (without tag)."
  type        = string
}

variable "web_image" {
  description = "ECR image URI for the Next.js web service (without tag)."
  type        = string
}

variable "sync_image" {
  description = "ECR image URI for the Python sync-worker (without tag)."
  type        = string
}

variable "scraper_image" {
  description = "ECR image URI for the Python recipe-scraper (without tag)."
  type        = string
}

variable "image_tag" {
  description = "Docker image tag to deploy."
  type        = string
  default     = "latest"
}

# ── ALB target groups ─────────────────────────────────────────────────────────

variable "server_target_group_arn" {
  description = "ALB target group ARN for the Go server."
  type        = string
}

variable "web_target_group_arn" {
  description = "ALB target group ARN for the Next.js web service."
  type        = string
}

# ── Secrets (valueFrom ARNs) ──────────────────────────────────────────────────

variable "jwt_secret_arn" {
  type = string
}

variable "db_password_arn" {
  type = string
}

variable "redis_password_arn" {
  type = string
}

variable "stripe_secret_key_arn" {
  type = string
}

variable "stripe_webhook_secret_arn" {
  type = string
}

variable "google_client_id_arn" {
  type = string
}

variable "google_client_secret_arn" {
  type = string
}

# ── Infrastructure endpoints ──────────────────────────────────────────────────

variable "db_host" {
  description = "Database host (shared cutly-db endpoint)."
  type        = string
}

variable "db_port" {
  description = "Database port."
  type        = number
  default     = 5432
}

variable "db_name" {
  description = "Database name inside the shared instance."
  type        = string
}

variable "db_username" {
  description = "Database role for Tidyboard."
  type        = string
}

variable "db_schema" {
  description = "Postgres schema for Tidyboard tables (sets search_path via role default)."
  type        = string
  default     = "tidyboard"
}

variable "db_security_group_id" {
  description = "Security group attached to the existing RDS instance. An ingress rule on port 5432 is added to allow ECS tasks to connect."
  type        = string
}

variable "redis_host" {
  description = "Redis primary endpoint."
  type        = string
}

variable "media_bucket" {
  description = "S3 media bucket name."
  type        = string
}

variable "domain_name" {
  description = "Public domain name (used to set CORS origins, portal URLs etc.)."
  type        = string
}

# ── Desired task counts ───────────────────────────────────────────────────────

variable "desired_count_server" {
  type    = number
  default = 1
}

variable "desired_count_web" {
  type    = number
  default = 1
}

variable "desired_count_sync" {
  type    = number
  default = 1
}

variable "desired_count_scraper" {
  type    = number
  default = 1
}

# ── CPU / memory ──────────────────────────────────────────────────────────────

variable "server_cpu" {
  type    = number
  default = 512
}

variable "server_memory" {
  type    = number
  default = 1024
}

variable "web_cpu" {
  type    = number
  default = 512
}

variable "web_memory" {
  type    = number
  default = 1024
}

variable "sync_cpu" {
  type    = number
  default = 256
}

variable "sync_memory" {
  type    = number
  default = 512
}

variable "scraper_cpu" {
  type    = number
  default = 256
}

variable "scraper_memory" {
  type    = number
  default = 512
}

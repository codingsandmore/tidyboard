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

variable "private_subnets" {
  description = "Private subnet IDs for the DB subnet group."
  type        = list(string)
}

variable "db_name" {
  description = "Initial database name."
  type        = string
  default     = "tidyboard"
}

variable "db_username" {
  description = "Master database username."
  type        = string
  default     = "tidyboard"
}

variable "db_password_arn" {
  description = "Secrets Manager ARN of the master password. The RDS cluster reads this via managed credentials."
  type        = string
}

variable "min_capacity" {
  description = "Aurora Serverless v2 minimum ACU."
  type        = number
  default     = 0.5
}

variable "max_capacity" {
  description = "Aurora Serverless v2 maximum ACU."
  type        = number
  default     = 4
}

variable "ecs_sg_id" {
  description = "ECS tasks security group ID — allowed to connect to the DB."
  type        = string
}

variable "postgres_engine_version" {
  description = "Aurora PostgreSQL engine version."
  type        = string
  default     = "16.4"
}

variable "backup_retention_days" {
  description = "Automated backup retention period in days."
  type        = number
  default     = 7
}

variable "deletion_protection" {
  description = "Enable deletion protection on the Aurora cluster."
  type        = bool
  default     = true
}

variable "project" {
  description = "Project name prefix."
  type        = string
}

variable "environment" {
  description = "Deployment environment."
  type        = string
}

variable "account_id" {
  description = "AWS account ID."
  type        = string
}

variable "aws_region" {
  description = "AWS region."
  type        = string
}

variable "secret_arns" {
  description = "List of Secrets Manager ARNs the task role is allowed to read."
  type        = list(string)
}

variable "media_bucket" {
  description = "S3 media bucket name."
  type        = string
}

variable "backup_bucket" {
  description = "S3 backup bucket name."
  type        = string
}

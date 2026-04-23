variable "project" {
  description = "Project name prefix."
  type        = string
}

variable "environment" {
  description = "Deployment environment."
  type        = string
}

variable "account_id" {
  description = "AWS account ID — appended to bucket names to ensure global uniqueness."
  type        = string
}

variable "media_lifecycle_glacier_days" {
  description = "Days before media objects transition to Glacier Instant Retrieval."
  type        = number
  default     = 90
}

variable "backup_lifecycle_expire_days" {
  description = "Days before backup objects are deleted."
  type        = number
  default     = 30
}

variable "project" {
  description = "Project name prefix."
  type        = string
}

variable "environment" {
  description = "Deployment environment."
  type        = string
}

variable "image_retention_count" {
  description = "Number of images to retain per repository (oldest untagged images are expired)."
  type        = number
  default     = 10
}

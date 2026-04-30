variable "project" {
  description = "Project name prefix."
  type        = string
}

variable "environment" {
  description = "Deployment environment (prod, staging, dev)."
  type        = string
}

variable "domain_name" {
  description = "Public apex domain for the web app. Used as the primary callback and logout URL for the Cognito app client."
  type        = string
}

variable "google_client_id" {
  description = "OAuth 2.0 client ID from Google Cloud Console for the Tidyboard app. Sourced from SSM by the caller."
  type        = string
  sensitive   = true
}

variable "google_client_secret" {
  description = "OAuth 2.0 client secret paired with google_client_id. Sourced from SSM by the caller."
  type        = string
  sensitive   = true
}

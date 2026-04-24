variable "project" {
  description = "Project name prefix."
  type        = string
}

variable "environment" {
  description = "Deployment environment."
  type        = string
}

variable "vpc_id" {
  description = "VPC ID where the EC2 instance will be launched."
  type        = string
}

variable "subnet_id" {
  description = "Public subnet ID for the EC2 instance (must have a route to an Internet Gateway)."
  type        = string
}

variable "instance_type" {
  description = "EC2 instance type. t4g.small (~$14/mo) is the recommended baseline."
  type        = string
  default     = "t4g.small"
}

variable "volume_size_gb" {
  description = "Root EBS volume size in GB."
  type        = number
  default     = 30
}

variable "ssh_key_name" {
  description = "Name of the EC2 key pair to associate with the instance. Create this in the AWS console and save the private key file."
  type        = string
}

variable "admin_ssh_cidr" {
  description = "CIDR block allowed to reach port 22 (SSH). Default is 0.0.0.0/0 — narrow this to your IP in production."
  type        = string
  default     = "0.0.0.0/0"
}

variable "secrets" {
  description = "Secrets read at plan-time from SSM and written to /opt/tidyboard/.env by cloud-init."
  type = object({
    jwt_secret                 = string
    db_password                = string
    stripe_secret_key          = string
    stripe_webhook_secret      = string
    google_oauth_client_id     = string
    google_oauth_client_secret = string
  })
  sensitive = true
}

variable "db_security_group_id" {
  description = "Security group ID of the shared RDS instance. The EC2 SG will be added as an ingress source on port 5432."
  type        = string
}

variable "domain_name" {
  description = "Domain name for the deployment — written as an instance tag so cloud-init can read it."
  type        = string
}

variable "aws_region" {
  description = "AWS region where SSM parameters and resources live. Used to scope the EC2 instance profile's SSM and KMS permissions."
  type        = string
  default     = "us-east-1"
}

variable "repo_url" {
  description = "Git repository URL cloned into /opt/tidyboard during cloud-init. Repo is private; cloud-init needs a deploy key path to clone (not yet wired in this module)."
  type        = string
  default     = "git@github.com:codingsandmore/tidyboard.git"
}

variable "repo_branch" {
  description = "Git branch to check out during cloud-init and on every deploy."
  type        = string
  default     = "main"
}

variable "db_host" {
  description = "Hostname of the Postgres RDS instance."
  type        = string
}

variable "db_port" {
  description = "Port of the Postgres RDS instance."
  type        = number
  default     = 5432
}

variable "db_schema" {
  description = "Postgres schema for Tidyboard tables."
  type        = string
  default     = "tidyboard"
}

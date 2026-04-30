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

# ── Domain + Route 53 ─────────────────────────────────────────────────────────

variable "domain_name" {
  description = "Apex domain for the deployment, e.g. tidyboard.org. Caddy on the EC2 obtains a Let's Encrypt cert for this + www."
  type        = string
}

variable "create_route53_records" {
  description = "When true, create Route 53 A records for the apex and www pointing at the EC2 EIP. Set to false if you manage DNS externally."
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
  description = "Security group attached to the existing RDS instance. An ingress rule on 5432 is added referencing the Tidyboard EC2 SG."
  type        = string
  default     = "sg-001c4c1a130b6ab42"
}

variable "existing_vpc_id" {
  description = "VPC hosting the shared Postgres. The Tidyboard EC2 runs in an additively-added public subnet inside this VPC."
  type        = string
  default     = "vpc-0c41d6012793ea910"
}

variable "db_name" {
  description = "PostgreSQL database name inside the shared instance. NOTE: the cutly-db RDS MasterUsername + DBName are both 'cutlist' (the instance identifier is 'cutly-db', but that's not the DB name)."
  type        = string
  default     = "cutlist"
}

variable "db_username" {
  description = "PostgreSQL role that Tidyboard connects as (created by bootstrap-db.sql)."
  type        = string
  default     = "tidyboard"
}

variable "db_schema" {
  description = "Postgres schema for Tidyboard tables inside the shared DB."
  type        = string
  default     = "tidyboard"
}

# ── EC2 ───────────────────────────────────────────────────────────────────────

variable "ssh_key_name" {
  description = "Name of the EC2 key pair. Create it in the AWS console and save the private key locally before running apply."
  type        = string
}

variable "admin_ssh_cidr" {
  description = "CIDR block allowed to reach port 22. Default 0.0.0.0/0 for convenience; narrow to your IP in production."
  type        = string
  default     = "0.0.0.0/0"
}

variable "ec2_instance_type" {
  description = "EC2 instance type. t4g.small (~$14/mo on-demand) is the Path C baseline."
  type        = string
  default     = "t4g.small"
}

variable "ec2_volume_size_gb" {
  description = "Root EBS volume size in GB."
  type        = number
  default     = 30
}

variable "repo_url" {
  description = "Git repo cloned into /opt/tidyboard during cloud-init. Private repo — the EC2 needs a deploy key (not yet wired here)."
  type        = string
  default     = "git@github.com:codingsandmore/tidyboard.git"
}

variable "repo_branch" {
  description = "Git branch to check out during cloud-init."
  type        = string
  default     = "main"
}

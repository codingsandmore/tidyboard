variable "project" {
  description = "Project name prefix."
  type        = string
}

variable "environment" {
  description = "Deployment environment."
  type        = string
}

variable "aws_region" {
  description = "AWS region — used to name VPC endpoints."
  type        = string
}

variable "create_new_vpc" {
  description = "When false (default), look up the existing VPC via existing_vpc_id. When true, create a fresh VPC + subnets + NAT GW."
  type        = bool
  default     = false
}

variable "existing_vpc_id" {
  description = "ID of the existing VPC to use when create_new_vpc = false."
  type        = string
  default     = ""
}

variable "add_public_to_existing" {
  description = "When true (default), add an IGW + a public subnet to the existing VPC so the Tidyboard EC2 can attach a public IP. cutly-db's existing private subnets are not touched."
  type        = bool
  default     = true
}

variable "existing_vpc_public_cidr" {
  description = "CIDR block for the additive public subnet inside the existing VPC. Must not overlap with any existing subnets."
  type        = string
  default     = "10.0.10.0/24"
}

variable "existing_vpc_public_az" {
  description = "Availability zone for the additive public subnet."
  type        = string
  default     = "us-east-1a"
}

variable "vpc_cidr" {
  description = "VPC CIDR block (only used when create_new_vpc = true)."
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for three public subnets (only used when create_new_vpc = true)."
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
}

variable "private_subnet_cidrs" {
  description = "CIDR blocks for three private subnets (only used when create_new_vpc = true)."
  type        = list(string)
  default     = ["10.0.11.0/24", "10.0.12.0/24", "10.0.13.0/24"]
}

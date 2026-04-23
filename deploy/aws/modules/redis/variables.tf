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
  description = "Private subnet IDs for the ElastiCache subnet group."
  type        = list(string)
}

variable "ecs_sg_id" {
  description = "ECS tasks security group ID — allowed to connect to Redis."
  type        = string
}

variable "node_type" {
  description = "ElastiCache node type."
  type        = string
  default     = "cache.t4g.micro"
}

variable "engine_version" {
  description = "Redis engine version."
  type        = string
  default     = "7.1"
}

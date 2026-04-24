output "vpc_id" {
  description = "VPC ID (existing or newly created)."
  value       = local.vpc_id
}

output "public_subnet_ids" {
  description = "List of public subnet IDs."
  value       = var.create_new_vpc ? aws_subnet.public[*].id : local.existing_public_ids
}

output "private_subnet_ids" {
  description = "List of private subnet IDs."
  value       = var.create_new_vpc ? aws_subnet.private[*].id : local.existing_private_ids
}

output "vpc_cidr" {
  description = "VPC CIDR block."
  value       = var.create_new_vpc ? aws_vpc.main[0].cidr_block : data.aws_vpc.existing[0].cidr_block
}

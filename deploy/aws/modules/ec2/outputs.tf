output "instance_id" {
  description = "EC2 instance ID."
  value       = aws_instance.app.id
}

output "public_ip" {
  description = "Elastic IP address associated with the instance."
  value       = aws_eip.app.public_ip
}

output "private_ip" {
  description = "Private IP of the EC2 instance (within the VPC)."
  value       = aws_instance.app.private_ip
}

output "security_group_id" {
  description = "ID of the EC2 instance security group."
  value       = aws_security_group.app.id
}

output "eip_allocation_id" {
  description = "Allocation ID of the Elastic IP."
  value       = aws_eip.app.id
}

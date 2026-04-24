output "app_url" {
  description = "Public HTTPS URL of the deployment (Caddy terminates TLS on the EC2)."
  value       = "https://${var.domain_name}"
}

output "ec2_instance_id" {
  description = "EC2 instance ID — handy for ssh + CloudWatch log lookups."
  value       = module.ec2.instance_id
}

output "ec2_public_ip" {
  description = "Elastic IP attached to the Tidyboard EC2. This is what the Route 53 A records point at."
  value       = module.ec2.public_ip
}

output "ec2_private_ip" {
  description = "Private IP of the EC2 inside the cutly VPC. Used by SG references on the RDS side."
  value       = module.ec2.private_ip
}

output "ssh_command" {
  description = "Copy-paste SSH command. Replace <your-key.pem> with the private key that matches ssh_key_name."
  value       = "ssh -i <your-key.pem> ec2-user@${module.ec2.public_ip}"
}

output "db_host" {
  description = "Shared Postgres endpoint (cutly-db). Read-only — Tidyboard does not manage this instance."
  value       = var.db_host
}

output "db_name" {
  description = "Database name inside the shared instance."
  value       = var.db_name
}

output "db_schema" {
  description = "Postgres schema that contains all Tidyboard tables."
  value       = var.db_schema
}

output "media_bucket_name" {
  description = "S3 media bucket name."
  value       = module.s3.media_bucket_name
}

output "backup_bucket_name" {
  description = "S3 backup bucket name."
  value       = module.s3.backup_bucket_name
}

output "cognito_user_pool_id" {
  description = "Cognito user pool ID. Export to the Go backend as TIDYBOARD_AUTH_COGNITO_USER_POOL_ID."
  value       = module.cognito.user_pool_id
}

output "cognito_client_id" {
  description = "Cognito app client ID. Export to the Next.js frontend as NEXT_PUBLIC_COGNITO_CLIENT_ID."
  value       = module.cognito.client_id
}

output "cognito_domain" {
  description = "Cognito user pool domain prefix. Full Hosted UI URL is https://<domain>.auth.<region>.amazoncognito.com"
  value       = module.cognito.domain
}

output "cognito_issuer" {
  description = "Cognito issuer URL — used by the Go JWT middleware for JWKS lookup + iss claim validation."
  value       = module.cognito.user_pool_endpoint
}

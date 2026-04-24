output "alb_dns_name" {
  description = "DNS name of the Application Load Balancer. Use this for an api.* CNAME if not using Route 53."
  value       = module.alb.alb_dns_name
}

output "cloudfront_url" {
  description = "CloudFront distribution domain (https://). This is the primary user-facing URL before custom domain DNS propagates."
  value       = "https://${module.cloudfront.domain_name}"
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID — needed for cache invalidations."
  value       = module.cloudfront.distribution_id
}

output "ecr_server_url" {
  description = "ECR repository URL for the Go server image."
  value       = module.ecr.server_repository_url
}

output "ecr_web_url" {
  description = "ECR repository URL for the Next.js web image."
  value       = module.ecr.web_repository_url
}

output "ecr_sync_worker_url" {
  description = "ECR repository URL for the Python sync-worker image."
  value       = module.ecr.sync_worker_repository_url
}

output "ecr_recipe_scraper_url" {
  description = "ECR repository URL for the Python recipe-scraper image."
  value       = module.ecr.recipe_scraper_repository_url
}

output "db_host" {
  description = "Shared Postgres endpoint used by all ECS tasks (cutly-db). Read-only — Tidyboard does not manage this instance."
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

output "redis_primary_endpoint" {
  description = "ElastiCache Redis primary endpoint — use as TIDYBOARD_REDIS_HOST."
  value       = module.redis.primary_endpoint
}

output "media_bucket_name" {
  description = "S3 media bucket name."
  value       = module.s3.media_bucket_name
}

output "backup_bucket_name" {
  description = "S3 backup bucket name."
  value       = module.s3.backup_bucket_name
}

output "ecs_cluster_name" {
  description = "ECS cluster name — used in ECS update-service commands."
  value       = module.ecs.cluster_name
}

output "acm_validation_records" {
  description = "DNS CNAME records required to validate the ACM certificate. Add these to your DNS provider if create_route53_records = false."
  value       = module.cloudfront.acm_validation_records
}

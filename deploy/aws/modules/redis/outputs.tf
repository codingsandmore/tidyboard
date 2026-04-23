output "primary_endpoint" {
  description = "Redis primary endpoint address — use as TIDYBOARD_REDIS_HOST."
  value       = aws_elasticache_replication_group.main.primary_endpoint_address
}

output "port" {
  description = "Redis port."
  value       = aws_elasticache_replication_group.main.port
}

output "redis_sg_id" {
  description = "Security group ID attached to the Redis cluster."
  value       = aws_security_group.redis.id
}

output "replication_group_id" {
  description = "ElastiCache replication group ID."
  value       = aws_elasticache_replication_group.main.id
}

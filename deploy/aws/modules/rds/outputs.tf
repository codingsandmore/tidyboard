output "cluster_endpoint" {
  description = "Aurora cluster writer endpoint (direct connection, no proxy)."
  value       = aws_rds_cluster.main.endpoint
}

output "cluster_reader_endpoint" {
  description = "Aurora cluster reader endpoint."
  value       = aws_rds_cluster.main.reader_endpoint
}

output "proxy_endpoint" {
  description = "RDS Proxy endpoint — use this as TIDYBOARD_DATABASE_HOST."
  value       = aws_db_proxy.main.endpoint
}

output "rds_sg_id" {
  description = "Security group ID attached to the Aurora cluster."
  value       = aws_security_group.rds.id
}

output "cluster_identifier" {
  description = "Aurora cluster identifier."
  value       = aws_rds_cluster.main.cluster_identifier
}

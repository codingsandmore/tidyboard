output "cluster_name" {
  description = "ECS cluster name."
  value       = aws_ecs_cluster.main.name
}

output "cluster_arn" {
  description = "ECS cluster ARN."
  value       = aws_ecs_cluster.main.arn
}

output "ecs_sg_id" {
  description = "Security group ID shared by all ECS tasks."
  value       = aws_security_group.ecs_tasks.id
}

output "server_service_name" {
  description = "ECS service name for the Go server."
  value       = aws_ecs_service.server.name
}

output "web_service_name" {
  description = "ECS service name for the Next.js web."
  value       = aws_ecs_service.web.name
}

output "sync_worker_service_name" {
  description = "ECS service name for the sync-worker."
  value       = aws_ecs_service.sync_worker.name
}

output "recipe_scraper_service_name" {
  description = "ECS service name for the recipe-scraper."
  value       = aws_ecs_service.recipe_scraper.name
}

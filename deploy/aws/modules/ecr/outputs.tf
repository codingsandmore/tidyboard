output "server_repository_url" {
  description = "ECR repository URL for the Go server image."
  value       = aws_ecr_repository.repos["server"].repository_url
}

output "web_repository_url" {
  description = "ECR repository URL for the Next.js web image."
  value       = aws_ecr_repository.repos["web"].repository_url
}

output "sync_worker_repository_url" {
  description = "ECR repository URL for the Python sync-worker image."
  value       = aws_ecr_repository.repos["sync_worker"].repository_url
}

output "recipe_scraper_repository_url" {
  description = "ECR repository URL for the Python recipe-scraper image."
  value       = aws_ecr_repository.repos["recipe_scraper"].repository_url
}

output "jwt_secret_arn" {
  description = "ARN of the JWT secret."
  value       = aws_secretsmanager_secret.jwt.arn
}

output "db_password_arn" {
  description = "ARN of the database password secret."
  value       = aws_secretsmanager_secret.db_password.arn
}

output "redis_password_arn" {
  description = "ARN of the Redis auth token secret."
  value       = aws_secretsmanager_secret.redis_password.arn
}

output "stripe_secret_key_arn" {
  description = "ARN of the Stripe secret key."
  value       = aws_secretsmanager_secret.stripe_secret_key.arn
}

output "stripe_webhook_secret_arn" {
  description = "ARN of the Stripe webhook signing secret."
  value       = aws_secretsmanager_secret.stripe_webhook_secret.arn
}

output "google_client_id_arn" {
  description = "ARN of the Google OAuth client ID secret."
  value       = aws_secretsmanager_secret.google_client_id.arn
}

output "google_client_secret_arn" {
  description = "ARN of the Google OAuth client secret."
  value       = aws_secretsmanager_secret.google_client_secret.arn
}

output "all_secret_arns" {
  description = "List of all secret ARNs — used in the IAM task role policy."
  value = [
    aws_secretsmanager_secret.jwt.arn,
    aws_secretsmanager_secret.db_password.arn,
    aws_secretsmanager_secret.redis_password.arn,
    aws_secretsmanager_secret.stripe_secret_key.arn,
    aws_secretsmanager_secret.stripe_webhook_secret.arn,
    aws_secretsmanager_secret.google_client_id.arn,
    aws_secretsmanager_secret.google_client_secret.arn,
  ]
}

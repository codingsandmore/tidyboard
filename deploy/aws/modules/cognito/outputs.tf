output "user_pool_id" {
  description = "Cognito user pool ID. Exposed to the Go backend as TIDYBOARD_AUTH_COGNITO_USER_POOL_ID for JWT validation (JWKS lookup)."
  value       = aws_cognito_user_pool.main.id
}

output "user_pool_arn" {
  description = "Cognito user pool ARN — handy for resource policies (e.g. API Gateway authorizers)."
  value       = aws_cognito_user_pool.main.arn
}

output "user_pool_endpoint" {
  description = "Issuer URL used to verify the iss claim on JWTs: cognito-idp.<region>.amazonaws.com/<pool-id>."
  value       = aws_cognito_user_pool.main.endpoint
}

output "client_id" {
  description = "Public app client ID. Used by the Next.js frontend to initiate OIDC flows; no secret."
  value       = aws_cognito_user_pool_client.web.id
}

output "domain" {
  description = "Hosted domain prefix (resolves to <domain>.auth.<region>.amazoncognito.com). Frontend redirects here to start the OIDC flow."
  value       = aws_cognito_user_pool_domain.main.domain
}

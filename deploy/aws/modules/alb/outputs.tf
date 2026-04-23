output "alb_arn" {
  description = "ARN of the Application Load Balancer."
  value       = aws_lb.main.arn
}

output "alb_dns_name" {
  description = "DNS name of the Application Load Balancer."
  value       = aws_lb.main.dns_name
}

output "alb_zone_id" {
  description = "Route 53 hosted zone ID of the ALB (for alias records)."
  value       = aws_lb.main.zone_id
}

output "alb_sg_id" {
  description = "Security group ID of the ALB."
  value       = aws_security_group.alb.id
}

output "server_target_group_arn" {
  description = "Target group ARN for the Go API server."
  value       = aws_lb_target_group.server.arn
}

output "web_target_group_arn" {
  description = "Target group ARN for the Next.js web service."
  value       = aws_lb_target_group.web.arn
}

output "acm_certificate_arn" {
  description = "ACM certificate ARN for the ALB HTTPS listener."
  value       = aws_acm_certificate.alb.arn
}

output "acm_certificate_domain_validation_options" {
  description = "DNS validation records for the ALB ACM certificate."
  value       = aws_acm_certificate.alb.domain_validation_options
}

output "https_listener_arn" {
  description = "ARN of the HTTPS listener."
  value       = aws_lb_listener.https.arn
}

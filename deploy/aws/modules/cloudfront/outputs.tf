output "domain_name" {
  description = "CloudFront distribution domain name (e.g. d1234abcd.cloudfront.net)."
  value       = aws_cloudfront_distribution.main.domain_name
}

output "distribution_id" {
  description = "CloudFront distribution ID — used for cache invalidations."
  value       = aws_cloudfront_distribution.main.id
}

output "hosted_zone_id" {
  description = "CloudFront hosted zone ID — used for Route 53 alias records."
  value       = aws_cloudfront_distribution.main.hosted_zone_id
}

output "acm_certificate_arn" {
  description = "ACM certificate ARN (us-east-1) for the CloudFront distribution."
  value       = aws_acm_certificate.cloudfront.arn
}

output "acm_validation_records" {
  description = "DNS CNAME records to add at your registrar to validate the ACM certificate. Map of domain -> {name, record, type}."
  value = {
    for dvo in aws_acm_certificate.cloudfront.domain_validation_options :
    dvo.domain_name => {
      name  = dvo.resource_record_name
      type  = dvo.resource_record_type
      value = dvo.resource_record_value
    }
  }
}

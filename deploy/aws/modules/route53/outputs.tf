output "root_record_fqdn" {
  description = "FQDN of the root domain A record."
  value       = aws_route53_record.root_ipv4.fqdn
}

output "www_record_fqdn" {
  description = "FQDN of the www subdomain A record."
  value       = aws_route53_record.www_ipv4.fqdn
}

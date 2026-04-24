# Simple A records pointing the apex domain and www subdomain at the EC2 EIP.
# Path C uses a single EC2 with Caddy for TLS termination — no CloudFront, no ALB,
# so DNS is flat.

resource "aws_route53_record" "root_ipv4" {
  zone_id = var.zone_id
  name    = var.domain_name
  type    = "A"
  ttl     = 300
  records = [var.eip_address]
}

resource "aws_route53_record" "www_ipv4" {
  zone_id = var.zone_id
  name    = "www.${var.domain_name}"
  type    = "A"
  ttl     = 300
  records = [var.eip_address]
}

# ── ACM Certificate Validation Records ───────────────────────────────────────
# Creates the DNS CNAME records required to validate the ACM certificate
# issued in the cloudfront module.

resource "aws_route53_record" "acm_validation" {
  for_each = var.acm_validation_records

  zone_id = var.zone_id
  name    = each.value.name
  type    = each.value.type
  ttl     = 60
  records = [each.value.value]
}

# ── Root domain → CloudFront ──────────────────────────────────────────────────

resource "aws_route53_record" "root_ipv4" {
  zone_id = var.zone_id
  name    = var.domain_name
  type    = "A"

  alias {
    name                   = var.cloudfront_domain
    zone_id                = var.cloudfront_hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "root_ipv6" {
  zone_id = var.zone_id
  name    = var.domain_name
  type    = "AAAA"

  alias {
    name                   = var.cloudfront_domain
    zone_id                = var.cloudfront_hosted_zone_id
    evaluate_target_health = false
  }
}

# ── www subdomain → CloudFront ────────────────────────────────────────────────

resource "aws_route53_record" "www_ipv4" {
  zone_id = var.zone_id
  name    = "www.${var.domain_name}"
  type    = "A"

  alias {
    name                   = var.cloudfront_domain
    zone_id                = var.cloudfront_hosted_zone_id
    evaluate_target_health = false
  }
}

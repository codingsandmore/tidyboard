# CloudFront requires ACM certs in us-east-1 regardless of deployment region.
# This module uses the aliased aws.us_east_1 provider.

locals {
  name_prefix = "${var.project}-${var.environment}"
  origin_id   = "${local.name_prefix}-alb-origin"
}

# ── ACM Certificate (us-east-1) ───────────────────────────────────────────────

resource "aws_acm_certificate" "cloudfront" {
  provider = aws.us_east_1

  domain_name               = var.domain_name
  subject_alternative_names = ["*.${var.domain_name}"]
  validation_method         = "DNS"

  tags = {
    Name = "${local.name_prefix}-cloudfront-cert"
  }

  lifecycle {
    create_before_destroy = true
  }
}

# ── CloudFront Distribution ───────────────────────────────────────────────────

resource "aws_cloudfront_distribution" "main" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "${local.name_prefix} — ALB origin"
  default_root_object = ""
  price_class         = var.price_class
  aliases             = [var.domain_name]
  wait_for_deployment = false

  # ── Origin: ALB (serves both web and /api/*) ────────────────────────────────
  origin {
    domain_name = var.alb_dns
    origin_id   = local.origin_id

    custom_origin_config {
      http_port                = 80
      https_port               = 443
      origin_protocol_policy   = "https-only"
      origin_ssl_protocols     = ["TLSv1.2"]
      origin_read_timeout      = 60
      origin_keepalive_timeout = 60
    }

    custom_header {
      name  = "X-Forwarded-Host"
      value = var.domain_name
    }
  }

  # ── Default cache behavior: web (Next.js SSR) ────────────────────────────────
  default_cache_behavior {
    allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = local.origin_id
    viewer_protocol_policy = "redirect-to-https"
    compress               = true

    # Use managed CachingDisabled for SSR pages (dynamic content)
    cache_policy_id          = "4135ea2d-6df8-44a3-9df3-4b5a84be39ad" # CachingDisabled
    origin_request_policy_id = "b689b0a8-53d0-40ab-baf2-68738e2966ac" # AllViewerExceptHostHeader

    # Forward all cookies, query strings, and headers for SSR
    forwarded_values {
      query_string = true
      cookies {
        forward = "all"
      }
      headers = ["Authorization", "Accept-Language"]
    }

    min_ttl     = 0
    default_ttl = 0
    max_ttl     = 0
  }

  # ── /api/* behavior: Go server (no caching) ──────────────────────────────────
  ordered_cache_behavior {
    path_pattern           = "/api/*"
    allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = local.origin_id
    viewer_protocol_policy = "https-only"
    compress               = false

    cache_policy_id          = "4135ea2d-6df8-44a3-9df3-4b5a84be39ad" # CachingDisabled
    origin_request_policy_id = "b689b0a8-53d0-40ab-baf2-68738e2966ac" # AllViewerExceptHostHeader

    forwarded_values {
      query_string = true
      cookies {
        forward = "all"
      }
      headers = ["Authorization", "Content-Type", "Accept"]
    }

    min_ttl     = 0
    default_ttl = 0
    max_ttl     = 0
  }

  # ── /ws/* behavior: WebSocket passthrough ────────────────────────────────────
  ordered_cache_behavior {
    path_pattern           = "/ws/*"
    allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = local.origin_id
    viewer_protocol_policy = "https-only"
    compress               = false

    cache_policy_id          = "4135ea2d-6df8-44a3-9df3-4b5a84be39ad" # CachingDisabled
    origin_request_policy_id = "b689b0a8-53d0-40ab-baf2-68738e2966ac" # AllViewerExceptHostHeader

    forwarded_values {
      query_string = true
      cookies {
        forward = "all"
      }
      headers = ["Upgrade", "Connection", "Sec-WebSocket-Key", "Sec-WebSocket-Version"]
    }

    min_ttl     = 0
    default_ttl = 0
    max_ttl     = 0
  }

  # ── Static assets: cache aggressively ────────────────────────────────────────
  ordered_cache_behavior {
    path_pattern           = "/_next/static/*"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = local.origin_id
    viewer_protocol_policy = "redirect-to-https"
    compress               = true

    # CachingOptimized — long TTL for immutable static assets
    cache_policy_id = "658327ea-f89d-4fab-a63d-7e88639e58f6"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    min_ttl     = 0
    default_ttl = 86400
    max_ttl     = 31536000
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate.cloudfront.arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  tags = {
    Name = "${local.name_prefix}-cf"
  }

  depends_on = [aws_acm_certificate.cloudfront]
}

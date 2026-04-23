locals {
  name_prefix = "${var.project}-${var.environment}"
}

# ── ACM Certificate (ALB region) ──────────────────────────────────────────────
# The ALB needs a cert in its own region. CloudFront needs a separate cert in
# us-east-1 (managed in the cloudfront module).

resource "aws_acm_certificate" "alb" {
  domain_name               = var.domain_name
  subject_alternative_names = ["*.${var.domain_name}"]
  validation_method         = "DNS"

  tags = {
    Name = "${local.name_prefix}-alb-cert"
  }

  lifecycle {
    create_before_destroy = true
  }
}

# ── ALB Security Group ────────────────────────────────────────────────────────

resource "aws_security_group" "alb" {
  name        = "${local.name_prefix}-alb-sg"
  description = "Allow HTTP and HTTPS from the internet to the ALB"
  vpc_id      = var.vpc_id

  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${local.name_prefix}-alb-sg"
  }
}

# ── Application Load Balancer ─────────────────────────────────────────────────

resource "aws_lb" "main" {
  name               = "${local.name_prefix}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = var.public_subnets

  enable_deletion_protection = false # set true for production

  tags = {
    Name = "${local.name_prefix}-alb"
  }
}

# ── Target Groups ─────────────────────────────────────────────────────────────

# Go API server — port 8080, health check /health
resource "aws_lb_target_group" "server" {
  name        = "${local.name_prefix}-server-tg"
  port        = 8080
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip" # required for Fargate

  health_check {
    enabled             = true
    path                = "/health"
    port                = "traffic-port"
    protocol            = "HTTP"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
    matcher             = "200"
  }

  deregistration_delay = 30

  tags = {
    Name = "${local.name_prefix}-server-tg"
  }
}

# Next.js web — port 3000, health check /
resource "aws_lb_target_group" "web" {
  name        = "${local.name_prefix}-web-tg"
  port        = 3000
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    enabled             = true
    path                = "/"
    port                = "traffic-port"
    protocol            = "HTTP"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
    matcher             = "200,304"
  }

  deregistration_delay = 30

  tags = {
    Name = "${local.name_prefix}-web-tg"
  }
}

# ── HTTP Listener — redirect to HTTPS ─────────────────────────────────────────

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type = "redirect"
    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

# ── HTTPS Listener — routes /api/* and /ws/* to server, rest to web ───────────

resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.main.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = aws_acm_certificate.alb.arn

  # Default: forward to web (Next.js)
  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.web.arn
  }

  depends_on = [aws_acm_certificate.alb]
}

# Forward /api/* to the Go server
resource "aws_lb_listener_rule" "api" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 10

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.server.arn
  }

  condition {
    path_pattern {
      values = ["/api/*"]
    }
  }
}

# Forward /ws/* (WebSocket) to the Go server
resource "aws_lb_listener_rule" "ws" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 20

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.server.arn
  }

  condition {
    path_pattern {
      values = ["/ws/*"]
    }
  }
}

# Forward /health to the Go server (used by CloudFront origin health checks)
resource "aws_lb_listener_rule" "health" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 5

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.server.arn
  }

  condition {
    path_pattern {
      values = ["/health", "/health/*"]
    }
  }
}

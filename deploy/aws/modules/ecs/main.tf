locals {
  name_prefix = "${var.project}-${var.environment}"
}

# ── ECS Cluster ───────────────────────────────────────────────────────────────

resource "aws_ecs_cluster" "main" {
  name = local.name_prefix

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = {
    Name = local.name_prefix
  }
}

resource "aws_ecs_cluster_capacity_providers" "main" {
  cluster_name       = aws_ecs_cluster.main.name
  capacity_providers = ["FARGATE", "FARGATE_SPOT"]

  default_capacity_provider_strategy {
    capacity_provider = "FARGATE"
    weight            = 1
    base              = 1
  }
}

# ── Shared ECS Security Group ─────────────────────────────────────────────────

resource "aws_security_group" "ecs_tasks" {
  name        = "${local.name_prefix}-ecs-tasks-sg"
  description = "Allow traffic from ALB to ECS tasks; allow all egress"
  vpc_id      = var.vpc_id

  ingress {
    description     = "From ALB — Go server (8080)"
    from_port       = 8080
    to_port         = 8080
    protocol        = "tcp"
    security_groups = [var.alb_sg_id]
  }

  ingress {
    description     = "From ALB — Next.js web (3000)"
    from_port       = 3000
    to_port         = 3000
    protocol        = "tcp"
    security_groups = [var.alb_sg_id]
  }

  ingress {
    description = "Internal service mesh — sync-worker (8001)"
    from_port   = 8001
    to_port     = 8001
    protocol    = "tcp"
    self        = true
  }

  ingress {
    description = "Internal service mesh — recipe-scraper (8002)"
    from_port   = 8002
    to_port     = 8002
    protocol    = "tcp"
    self        = true
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${local.name_prefix}-ecs-tasks-sg"
  }
}

# ── CloudWatch Log Groups ─────────────────────────────────────────────────────

resource "aws_cloudwatch_log_group" "server" {
  name              = "/ecs/${local.name_prefix}/server"
  retention_in_days = 14
  tags              = { Name = "${local.name_prefix}-server-logs" }
}

resource "aws_cloudwatch_log_group" "web" {
  name              = "/ecs/${local.name_prefix}/web"
  retention_in_days = 14
  tags              = { Name = "${local.name_prefix}-web-logs" }
}

resource "aws_cloudwatch_log_group" "sync_worker" {
  name              = "/ecs/${local.name_prefix}/sync-worker"
  retention_in_days = 14
  tags              = { Name = "${local.name_prefix}-sync-worker-logs" }
}

resource "aws_cloudwatch_log_group" "recipe_scraper" {
  name              = "/ecs/${local.name_prefix}/recipe-scraper"
  retention_in_days = 14
  tags              = { Name = "${local.name_prefix}-recipe-scraper-logs" }
}

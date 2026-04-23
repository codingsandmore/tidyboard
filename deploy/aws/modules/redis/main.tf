locals {
  name_prefix = "${var.project}-${var.environment}"
}

# ── Security group ────────────────────────────────────────────────────────────

resource "aws_security_group" "redis" {
  name        = "${local.name_prefix}-redis-sg"
  description = "Allow Redis traffic from ECS tasks"
  vpc_id      = var.vpc_id

  ingress {
    description     = "Redis from ECS tasks"
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [var.ecs_sg_id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${local.name_prefix}-redis-sg"
  }
}

# ── Subnet group ──────────────────────────────────────────────────────────────

resource "aws_elasticache_subnet_group" "main" {
  name        = "${local.name_prefix}-redis-subnet-group"
  description = "Subnet group for ElastiCache Redis"
  subnet_ids  = var.private_subnets

  tags = {
    Name = "${local.name_prefix}-redis-subnet-group"
  }
}

# ── Parameter group ───────────────────────────────────────────────────────────

resource "aws_elasticache_parameter_group" "main" {
  name        = "${local.name_prefix}-redis-params"
  family      = "redis7"
  description = "Tidyboard Redis parameter group"

  # Enable AOF persistence so Redis data survives container restarts
  parameter {
    name  = "appendonly"
    value = "yes"
  }

  tags = {
    Name = "${local.name_prefix}-redis-params"
  }
}

# ── Replication group (single node, cluster mode disabled) ────────────────────
# Cluster mode disabled keeps the broadcaster pub/sub code simple.
# Upgrade to multi-AZ by setting num_cache_clusters = 2 and
# automatic_failover_enabled = true when HA is required.

resource "aws_elasticache_replication_group" "main" {
  replication_group_id = "${local.name_prefix}-redis"
  description          = "Tidyboard Redis — WebSocket pub/sub, rate limiting, session cache"

  engine               = "redis"
  engine_version       = var.engine_version
  node_type            = var.node_type
  num_cache_clusters   = 1
  parameter_group_name = aws_elasticache_parameter_group.main.name
  subnet_group_name    = aws_elasticache_subnet_group.main.name
  security_group_ids   = [aws_security_group.redis.id]

  port                       = 6379
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true

  # auth_token sets the Redis AUTH password. The value is read from Secrets
  # Manager at apply time via the data source in the ECS module; we store it
  # in the parameter group to avoid re-creating the cluster on every plan.
  # Leave empty to disable AUTH (not recommended for production).
  # auth_token = ... # Set after first apply if desired; changing requires cluster re-create.

  automatic_failover_enabled = false # single-node; set true with num_cache_clusters >= 2

  maintenance_window       = "sun:05:00-sun:06:00"
  snapshot_retention_limit = 3
  snapshot_window          = "04:00-05:00"

  tags = {
    Name = "${local.name_prefix}-redis"
  }
}

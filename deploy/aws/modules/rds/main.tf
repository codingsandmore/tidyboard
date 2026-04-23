locals {
  name_prefix = "${var.project}-${var.environment}"
}

# ── Security group ────────────────────────────────────────────────────────────

resource "aws_security_group" "rds" {
  name        = "${local.name_prefix}-rds-sg"
  description = "Allow PostgreSQL traffic from ECS tasks"
  vpc_id      = var.vpc_id

  ingress {
    description     = "PostgreSQL from ECS tasks"
    from_port       = 5432
    to_port         = 5432
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
    Name = "${local.name_prefix}-rds-sg"
  }
}

# ── DB subnet group ───────────────────────────────────────────────────────────

resource "aws_db_subnet_group" "main" {
  name        = "${local.name_prefix}-db-subnet-group"
  description = "Subnet group for Aurora cluster"
  subnet_ids  = var.private_subnets

  tags = {
    Name = "${local.name_prefix}-db-subnet-group"
  }
}

# ── Aurora Serverless v2 cluster ──────────────────────────────────────────────

resource "aws_rds_cluster" "main" {
  cluster_identifier = "${local.name_prefix}-aurora"

  engine         = "aurora-postgresql"
  engine_version = var.postgres_engine_version
  engine_mode    = "provisioned" # required for Serverless v2

  database_name   = var.db_name
  master_username = var.db_username
  # Password is managed via Secrets Manager; we read the secret value here
  # at plan time so Aurora can configure the master credentials.
  manage_master_user_password = false
  master_password             = data.aws_secretsmanager_secret_version.db_password.secret_string

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]

  storage_encrypted         = true
  backup_retention_period   = var.backup_retention_days
  skip_final_snapshot       = false
  final_snapshot_identifier = "${local.name_prefix}-final-snapshot"
  deletion_protection       = var.deletion_protection

  serverlessv2_scaling_configuration {
    min_capacity             = var.min_capacity
    max_capacity             = var.max_capacity
    seconds_until_auto_pause = 0 # auto-pause disabled; set >300 to enable for dev
  }

  enabled_cloudwatch_logs_exports = ["postgresql"]

  tags = {
    Name = "${local.name_prefix}-aurora"
  }
}

data "aws_secretsmanager_secret_version" "db_password" {
  secret_id = var.db_password_arn
}

# ── Writer instance (Serverless v2 requires at least one instance) ────────────

resource "aws_rds_cluster_instance" "writer" {
  identifier         = "${local.name_prefix}-aurora-writer"
  cluster_identifier = aws_rds_cluster.main.id
  instance_class     = "db.serverless"
  engine             = aws_rds_cluster.main.engine
  engine_version     = aws_rds_cluster.main.engine_version

  db_subnet_group_name = aws_db_subnet_group.main.name

  performance_insights_enabled = true

  tags = {
    Name = "${local.name_prefix}-aurora-writer"
  }
}

# ── RDS Proxy ─────────────────────────────────────────────────────────────────
# Connection pooling — essential for Fargate tasks that create many short-lived
# connections (each container restart opens a fresh connection pool).

resource "aws_iam_role" "rds_proxy" {
  name = "${local.name_prefix}-rds-proxy-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "rds.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })

  tags = {
    Name = "${local.name_prefix}-rds-proxy-role"
  }
}

resource "aws_iam_role_policy" "rds_proxy_secrets" {
  name = "${local.name_prefix}-rds-proxy-secrets"
  role = aws_iam_role.rds_proxy.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["secretsmanager:GetSecretValue"]
      Resource = [var.db_password_arn]
    }]
  })
}

resource "aws_security_group" "rds_proxy" {
  name        = "${local.name_prefix}-rds-proxy-sg"
  description = "Allow PostgreSQL from ECS tasks to RDS Proxy"
  vpc_id      = var.vpc_id

  ingress {
    description     = "PostgreSQL from ECS tasks"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [var.ecs_sg_id]
  }

  egress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.rds.id]
  }

  tags = {
    Name = "${local.name_prefix}-rds-proxy-sg"
  }
}

resource "aws_db_proxy" "main" {
  name                   = "${local.name_prefix}-proxy"
  debug_logging          = false
  engine_family          = "POSTGRESQL"
  idle_client_timeout    = 1800
  require_tls            = true
  role_arn               = aws_iam_role.rds_proxy.arn
  vpc_security_group_ids = [aws_security_group.rds_proxy.id]
  vpc_subnet_ids         = var.private_subnets

  auth {
    auth_scheme = "SECRETS"
    iam_auth    = "DISABLED"
    secret_arn  = var.db_password_arn
  }

  tags = {
    Name = "${local.name_prefix}-proxy"
  }

  depends_on = [aws_rds_cluster_instance.writer]
}

resource "aws_db_proxy_default_target_group" "main" {
  db_proxy_name = aws_db_proxy.main.name

  connection_pool_config {
    connection_borrow_timeout    = 120
    max_connections_percent      = 100
    max_idle_connections_percent = 50
  }
}

resource "aws_db_proxy_target" "main" {
  db_cluster_identifier = aws_rds_cluster.main.id
  db_proxy_name         = aws_db_proxy.main.name
  target_group_name     = aws_db_proxy_default_target_group.main.name
}

# ── CloudWatch log group ──────────────────────────────────────────────────────

resource "aws_cloudwatch_log_group" "aurora" {
  name              = "/aws/rds/cluster/${local.name_prefix}-aurora/postgresql"
  retention_in_days = 14

  tags = {
    Name = "${local.name_prefix}-aurora-logs"
  }
}

locals {
  name_prefix = "${var.project}-${var.environment}"
}

# ── ECS Task Execution Role ───────────────────────────────────────────────────
# Used by the ECS agent to pull images from ECR and write logs to CloudWatch.
# This is NOT the role the application code runs as.

resource "aws_iam_role" "execution" {
  name = "${local.name_prefix}-ecs-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })

  tags = {
    Name = "${local.name_prefix}-ecs-execution-role"
  }
}

# Attach the AWS-managed policy for ECR pull + CloudWatch logs
resource "aws_iam_role_policy_attachment" "execution_managed" {
  role       = aws_iam_role.execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# Allow the execution role to read secrets at task startup (for secrets injection)
resource "aws_iam_role_policy" "execution_secrets" {
  name = "${local.name_prefix}-execution-secrets"
  role = aws_iam_role.execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "ReadSecrets"
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret",
        ]
        Resource = var.secret_arns
      }
    ]
  })
}

# ── ECS Task Role ─────────────────────────────────────────────────────────────
# The role the application code assumes at runtime.
# Least-privilege: only what the app actually needs.

resource "aws_iam_role" "task" {
  name = "${local.name_prefix}-ecs-task-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })

  tags = {
    Name = "${local.name_prefix}-ecs-task-role"
  }
}

# S3: read/write media bucket, read/write backup bucket
resource "aws_iam_role_policy" "task_s3" {
  name = "${local.name_prefix}-task-s3"
  role = aws_iam_role.task.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "MediaBucketReadWrite"
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket",
        ]
        Resource = [
          "arn:aws:s3:::${var.media_bucket}",
          "arn:aws:s3:::${var.media_bucket}/*",
        ]
      },
      {
        Sid    = "BackupBucketReadWrite"
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:ListBucket",
        ]
        Resource = [
          "arn:aws:s3:::${var.backup_bucket}",
          "arn:aws:s3:::${var.backup_bucket}/*",
        ]
      }
    ]
  })
}

# Secrets Manager: read all application secrets at runtime
resource "aws_iam_role_policy" "task_secrets" {
  name = "${local.name_prefix}-task-secrets"
  role = aws_iam_role.task.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "ReadApplicationSecrets"
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret",
        ]
        Resource = var.secret_arns
      }
    ]
  })
}

# CloudWatch: allow tasks to write custom metrics and structured logs
resource "aws_iam_role_policy" "task_cloudwatch" {
  name = "${local.name_prefix}-task-cloudwatch"
  role = aws_iam_role.task.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "CloudWatchLogs"
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:DescribeLogStreams",
        ]
        Resource = "arn:aws:logs:${var.aws_region}:${var.account_id}:log-group:/ecs/${local.name_prefix}*"
      }
    ]
  })
}

# ECS Exec: allow interactive exec into running containers for debugging
resource "aws_iam_role_policy" "task_ecs_exec" {
  name = "${local.name_prefix}-task-ecs-exec"
  role = aws_iam_role.task.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "ECSExec"
        Effect = "Allow"
        Action = [
          "ssmmessages:CreateControlChannel",
          "ssmmessages:CreateDataChannel",
          "ssmmessages:OpenControlChannel",
          "ssmmessages:OpenDataChannel",
        ]
        Resource = "*"
      }
    ]
  })
}

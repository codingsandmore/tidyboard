# ── Python Sync-Worker Task Definition + Service ──────────────────────────────
# CalDAV sync service — triggered on a schedule and by API calls from the Go server.
# Runs on port 8001 (matches services/sync-worker/Dockerfile EXPOSE 8001).

resource "aws_ecs_task_definition" "sync_worker" {
  family                   = "${local.name_prefix}-sync-worker"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.sync_cpu
  memory                   = var.sync_memory
  execution_role_arn       = var.execution_role_arn
  task_role_arn            = var.task_role_arn

  container_definitions = jsonencode([
    {
      name      = "sync-worker"
      image     = "${var.sync_image}:${var.image_tag}"
      essential = true

      portMappings = [
        {
          containerPort = 8001
          protocol      = "tcp"
        }
      ]

      environment = [
        { name = "TIDYBOARD_DATABASE_HOST", value = var.db_host },
        { name = "TIDYBOARD_DATABASE_PORT", value = "5432" },
        { name = "TIDYBOARD_DATABASE_NAME", value = var.db_name },
        { name = "TIDYBOARD_DATABASE_USER", value = var.db_username },
        { name = "TIDYBOARD_DATABASE_SSLMODE", value = "require" },
        { name = "TIDYBOARD_REDIS_HOST", value = var.redis_host },
        { name = "TIDYBOARD_REDIS_PORT", value = "6379" },
        { name = "SYNC_WORKER_PORT", value = "8001" },
      ]

      secrets = [
        { name = "TIDYBOARD_DATABASE_PASSWORD", valueFrom = var.db_password_arn },
        { name = "TIDYBOARD_REDIS_PASSWORD", valueFrom = var.redis_password_arn },
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.sync_worker.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "sync-worker"
        }
      }

      healthCheck = {
        command     = ["CMD-SHELL", "python -c \"import urllib.request; urllib.request.urlopen('http://localhost:8001/health')\" || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 30
      }

      stopTimeout = 30
    }
  ])

  tags = {
    Name = "${local.name_prefix}-sync-worker-task"
  }
}

resource "aws_ecs_service" "sync_worker" {
  name            = "${local.name_prefix}-sync-worker"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.sync_worker.arn
  desired_count   = var.desired_count_sync
  launch_type     = "FARGATE"

  enable_execute_command = true

  network_configuration {
    subnets          = var.private_subnets
    security_groups  = [aws_security_group.ecs_tasks.id]
    assign_public_ip = false
  }

  deployment_minimum_healthy_percent = 50
  deployment_maximum_percent         = 200

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  lifecycle {
    ignore_changes = [task_definition, desired_count]
  }

  tags = {
    Name = "${local.name_prefix}-sync-worker-service"
  }
}

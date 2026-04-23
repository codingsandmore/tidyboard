# ── Go API Server Task Definition + Service ───────────────────────────────────

resource "aws_ecs_task_definition" "server" {
  family                   = "${local.name_prefix}-server"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.server_cpu
  memory                   = var.server_memory
  execution_role_arn       = var.execution_role_arn
  task_role_arn            = var.task_role_arn

  container_definitions = jsonencode([
    {
      name      = "server"
      image     = "${var.server_image}:${var.image_tag}"
      essential = true

      portMappings = [
        {
          containerPort = 8080
          protocol      = "tcp"
        }
      ]

      environment = [
        { name = "TIDYBOARD_SERVER_HOST", value = "0.0.0.0" },
        { name = "TIDYBOARD_SERVER_PORT", value = "8080" },
        { name = "TIDYBOARD_DATABASE_HOST", value = var.db_host },
        { name = "TIDYBOARD_DATABASE_PORT", value = "5432" },
        { name = "TIDYBOARD_DATABASE_NAME", value = var.db_name },
        { name = "TIDYBOARD_DATABASE_USER", value = var.db_username },
        { name = "TIDYBOARD_DATABASE_SSLMODE", value = "require" },
        { name = "TIDYBOARD_REDIS_PORT", value = "6379" },
        { name = "TIDYBOARD_REDIS_HOST", value = var.redis_host },
        { name = "TIDYBOARD_STORAGE_TYPE", value = "s3" },
        { name = "TIDYBOARD_STORAGE_S3_BUCKET", value = var.media_bucket },
        { name = "TIDYBOARD_STORAGE_S3_REGION", value = var.aws_region },
        { name = "TIDYBOARD_SERVER_CORS_ORIGINS", value = "https://${var.domain_name}" },
        # Sync-worker and recipe-scraper run as sibling ECS services.
        # Service Connect or Cloud Map would allow DNS resolution by service name.
        # For simplicity we use localhost service discovery via ECS Service Connect.
        { name = "TIDYBOARD_SYNC_WORKER_URL", value = "http://tidyboard-sync-worker.${local.name_prefix}.local:8001" },
        { name = "TIDYBOARD_RECIPE_SCRAPER_URL", value = "http://tidyboard-recipe-scraper.${local.name_prefix}.local:8002" },
      ]

      secrets = [
        { name = "TIDYBOARD_AUTH_JWT_SECRET", valueFrom = var.jwt_secret_arn },
        { name = "TIDYBOARD_DATABASE_PASSWORD", valueFrom = var.db_password_arn },
        { name = "TIDYBOARD_REDIS_PASSWORD", valueFrom = var.redis_password_arn },
        { name = "TIDYBOARD_STRIPE_SECRET_KEY", valueFrom = var.stripe_secret_key_arn },
        { name = "TIDYBOARD_STRIPE_WEBHOOK_SECRET", valueFrom = var.stripe_webhook_secret_arn },
        { name = "TIDYBOARD_AUTH_OAUTH_GOOGLE_CLIENT_ID", valueFrom = var.google_client_id_arn },
        { name = "TIDYBOARD_AUTH_OAUTH_GOOGLE_CLIENT_SECRET", valueFrom = var.google_client_secret_arn },
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.server.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "server"
        }
      }

      healthCheck = {
        command     = ["CMD-SHELL", "wget -qO- http://localhost:8080/health || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 30
      }

      readonlyRootFilesystem = false
      stopTimeout            = 30
    }
  ])

  tags = {
    Name = "${local.name_prefix}-server-task"
  }
}

resource "aws_ecs_service" "server" {
  name            = "${local.name_prefix}-server"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.server.arn
  desired_count   = var.desired_count_server
  launch_type     = "FARGATE"

  enable_execute_command = true # allows `aws ecs execute-command` for debugging

  network_configuration {
    subnets          = var.private_subnets
    security_groups  = [aws_security_group.ecs_tasks.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = var.server_target_group_arn
    container_name   = "server"
    container_port   = 8080
  }

  deployment_minimum_healthy_percent = 50
  deployment_maximum_percent         = 200

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  lifecycle {
    # Ignore task definition changes triggered by external deploys (CI/CD)
    # so that `terraform apply` doesn't revert image tags pushed by the deploy script.
    ignore_changes = [task_definition, desired_count]
  }

  tags = {
    Name = "${local.name_prefix}-server-service"
  }
}

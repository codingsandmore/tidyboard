# ── Python Recipe-Scraper Task Definition + Service ───────────────────────────
# Recipe import service — triggered by API calls from the Go server.
# Runs on port 8002 (matches services/recipe-scraper/Dockerfile EXPOSE 8002).

resource "aws_ecs_task_definition" "recipe_scraper" {
  family                   = "${local.name_prefix}-recipe-scraper"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.scraper_cpu
  memory                   = var.scraper_memory
  execution_role_arn       = var.execution_role_arn
  task_role_arn            = var.task_role_arn

  container_definitions = jsonencode([
    {
      name      = "recipe-scraper"
      image     = "${var.scraper_image}:${var.image_tag}"
      essential = true

      portMappings = [
        {
          containerPort = 8002
          protocol      = "tcp"
        }
      ]

      environment = [
        { name = "TIDYBOARD_DATABASE_HOST", value = var.db_host },
        { name = "TIDYBOARD_DATABASE_PORT", value = "5432" },
        { name = "TIDYBOARD_DATABASE_NAME", value = var.db_name },
        { name = "TIDYBOARD_DATABASE_USER", value = var.db_username },
        { name = "TIDYBOARD_DATABASE_SSLMODE", value = "require" },
        { name = "RECIPE_SCRAPER_PORT", value = "8002" },
      ]

      secrets = [
        { name = "TIDYBOARD_DATABASE_PASSWORD", valueFrom = var.db_password_arn },
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.recipe_scraper.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "recipe-scraper"
        }
      }

      healthCheck = {
        command     = ["CMD-SHELL", "python -c \"import urllib.request; urllib.request.urlopen('http://localhost:8002/health')\" || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 30
      }

      stopTimeout = 30
    }
  ])

  tags = {
    Name = "${local.name_prefix}-recipe-scraper-task"
  }
}

resource "aws_ecs_service" "recipe_scraper" {
  name            = "${local.name_prefix}-recipe-scraper"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.recipe_scraper.arn
  desired_count   = var.desired_count_scraper
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
    Name = "${local.name_prefix}-recipe-scraper-service"
  }
}

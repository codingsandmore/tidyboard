# ── Data sources ──────────────────────────────────────────────────────────────

data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# ── Locals ────────────────────────────────────────────────────────────────────

locals {
  account_id  = data.aws_caller_identity.current.account_id
  region      = data.aws_region.current.name
  name_prefix = "${var.project}-${var.environment}"
}

# ── Network ───────────────────────────────────────────────────────────────────
# Uses the existing cutly-db VPC by default (create_new_vpc = false).
# Pass create_new_vpc = true only for a brand-new account with no shared infra.

module "network" {
  source = "./modules/network"

  project         = var.project
  environment     = var.environment
  aws_region      = var.aws_region
  create_new_vpc  = false
  existing_vpc_id = var.existing_vpc_id
}

# ── Secrets Manager ───────────────────────────────────────────────────────────

module "secrets" {
  source = "./modules/secrets"

  project     = var.project
  environment = var.environment
}

# ── IAM ───────────────────────────────────────────────────────────────────────

module "iam" {
  source = "./modules/iam"

  project       = var.project
  environment   = var.environment
  account_id    = local.account_id
  aws_region    = local.region
  secret_arns   = module.secrets.all_secret_arns
  media_bucket  = module.s3.media_bucket_name
  backup_bucket = module.s3.backup_bucket_name
}

# ── S3 ────────────────────────────────────────────────────────────────────────

module "s3" {
  source = "./modules/s3"

  project     = var.project
  environment = var.environment
  account_id  = local.account_id
}

# ── ECR ───────────────────────────────────────────────────────────────────────

module "ecr" {
  source = "./modules/ecr"

  project     = var.project
  environment = var.environment
}

# ── Redis (ElastiCache) ───────────────────────────────────────────────────────

module "redis" {
  source = "./modules/redis"

  project         = var.project
  environment     = var.environment
  vpc_id          = module.network.vpc_id
  private_subnets = module.network.private_subnet_ids
  ecs_sg_id       = module.ecs.ecs_sg_id
}

# ── ALB ───────────────────────────────────────────────────────────────────────

module "alb" {
  source = "./modules/alb"

  project         = var.project
  environment     = var.environment
  vpc_id          = module.network.vpc_id
  public_subnets  = module.network.public_subnet_ids
  domain_name     = var.domain_name
  certificate_arn = module.alb.acm_certificate_arn
}

# ── ECS ───────────────────────────────────────────────────────────────────────

module "ecs" {
  source = "./modules/ecs"

  project     = var.project
  environment = var.environment
  aws_region  = local.region
  account_id  = local.account_id
  vpc_id      = module.network.vpc_id

  private_subnets = module.network.private_subnet_ids
  alb_sg_id       = module.alb.alb_sg_id

  # Task execution + task roles
  execution_role_arn = module.iam.execution_role_arn
  task_role_arn      = module.iam.task_role_arn

  # ECR image URIs
  server_image  = module.ecr.server_repository_url
  web_image     = module.ecr.web_repository_url
  sync_image    = module.ecr.sync_worker_repository_url
  scraper_image = module.ecr.recipe_scraper_repository_url

  # ALB target groups
  server_target_group_arn = module.alb.server_target_group_arn
  web_target_group_arn    = module.alb.web_target_group_arn

  # Secrets (valueFrom ARNs injected into task env)
  jwt_secret_arn            = module.secrets.jwt_secret_arn
  db_password_arn           = module.secrets.db_password_arn
  redis_password_arn        = module.secrets.redis_password_arn
  stripe_secret_key_arn     = module.secrets.stripe_secret_key_arn
  stripe_webhook_secret_arn = module.secrets.stripe_webhook_secret_arn
  google_client_id_arn      = module.secrets.google_client_id_arn
  google_client_secret_arn  = module.secrets.google_client_secret_arn

  # Shared Postgres (cutly-db) — no Aurora provisioned
  db_host              = var.db_host
  db_port              = var.db_port
  db_name              = var.db_name
  db_username          = var.db_username
  db_schema            = var.db_schema
  db_security_group_id = var.db_security_group_id

  redis_host   = module.redis.primary_endpoint
  media_bucket = module.s3.media_bucket_name
  domain_name  = var.domain_name

  # Desired counts
  desired_count_server  = var.ecs_desired_count_server
  desired_count_web     = var.ecs_desired_count_web
  desired_count_sync    = var.ecs_desired_count_sync
  desired_count_scraper = var.ecs_desired_count_scraper

  # CPU / memory
  server_cpu     = var.server_cpu
  server_memory  = var.server_memory
  web_cpu        = var.web_cpu
  web_memory     = var.web_memory
  sync_cpu       = var.sync_cpu
  sync_memory    = var.sync_memory
  scraper_cpu    = var.scraper_cpu
  scraper_memory = var.scraper_memory
}

# ── CloudFront ────────────────────────────────────────────────────────────────

module "cloudfront" {
  source = "./modules/cloudfront"

  providers = {
    aws           = aws
    aws.us_east_1 = aws.us_east_1
  }

  project     = var.project
  environment = var.environment
  domain_name = var.domain_name
  alb_dns     = module.alb.alb_dns_name
}

# ── Route 53 ──────────────────────────────────────────────────────────────────

module "route53" {
  source = "./modules/route53"
  count  = var.create_route53_records ? 1 : 0

  domain_name               = var.domain_name
  zone_id                   = var.route53_zone_id
  cloudfront_domain         = module.cloudfront.domain_name
  cloudfront_hosted_zone_id = module.cloudfront.hosted_zone_id
  alb_dns                   = module.alb.alb_dns_name
  alb_zone_id               = module.alb.alb_zone_id
  acm_validation_records    = module.cloudfront.acm_validation_records
}

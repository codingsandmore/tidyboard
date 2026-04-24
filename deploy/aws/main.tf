# ── Data sources ──────────────────────────────────────────────────────────────

data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# ── Locals ────────────────────────────────────────────────────────────────────

locals {
  account_id  = data.aws_caller_identity.current.account_id
  region      = data.aws_region.current.name
  name_prefix = "${var.project}-${var.environment}"
  ssm_prefix  = "/${var.project}/${var.environment}"
}

# ── Secrets pulled from SSM Parameter Store ──────────────────────────────────
# Each SecureString is populated once out-of-band via scripts/put-ssm-params.sh.
# Terraform only reads them at plan/apply time and passes them through to the
# EC2 cloud-init .env file. Nothing is written to SSM from this config.

data "aws_ssm_parameter" "jwt_secret" {
  name            = "${local.ssm_prefix}/jwt-secret"
  with_decryption = true
}

data "aws_ssm_parameter" "db_password" {
  name            = "${local.ssm_prefix}/db-password"
  with_decryption = true
}

data "aws_ssm_parameter" "stripe_secret_key" {
  name            = "${local.ssm_prefix}/stripe-secret-key"
  with_decryption = true
}

data "aws_ssm_parameter" "stripe_webhook_secret" {
  name            = "${local.ssm_prefix}/stripe-webhook-secret"
  with_decryption = true
}

data "aws_ssm_parameter" "google_oauth_client_id" {
  name            = "${local.ssm_prefix}/google-oauth-client-id"
  with_decryption = true
}

data "aws_ssm_parameter" "google_oauth_client_secret" {
  name            = "${local.ssm_prefix}/google-oauth-client-secret"
  with_decryption = true
}

# ── Network ───────────────────────────────────────────────────────────────────
# Reuses the existing cutly-db VPC and adds an IGW + a public subnet in it so
# the Tidyboard EC2 can attach a public EIP. cutly-db's private subnets are
# not touched.

module "network" {
  source = "./modules/network"

  project         = var.project
  environment     = var.environment
  aws_region      = var.aws_region
  create_new_vpc  = false
  existing_vpc_id = var.existing_vpc_id
}

# ── S3 — media + backups ─────────────────────────────────────────────────────

module "s3" {
  source = "./modules/s3"

  project     = var.project
  environment = var.environment
  account_id  = local.account_id
}

# ── EC2 — single-instance docker compose deployment (Path C) ─────────────────

module "ec2" {
  source = "./modules/ec2"

  project     = var.project
  environment = var.environment
  aws_region  = var.aws_region

  vpc_id               = module.network.vpc_id
  subnet_id            = module.network.public_subnet_ids[0]
  db_security_group_id = var.db_security_group_id

  ssh_key_name   = var.ssh_key_name
  admin_ssh_cidr = var.admin_ssh_cidr
  instance_type  = var.ec2_instance_type
  volume_size_gb = var.ec2_volume_size_gb

  domain_name = var.domain_name
  repo_url    = var.repo_url
  repo_branch = var.repo_branch

  db_host   = var.db_host
  db_port   = var.db_port
  db_schema = var.db_schema

  secrets = {
    jwt_secret                 = data.aws_ssm_parameter.jwt_secret.value
    db_password                = data.aws_ssm_parameter.db_password.value
    stripe_secret_key          = data.aws_ssm_parameter.stripe_secret_key.value
    stripe_webhook_secret      = data.aws_ssm_parameter.stripe_webhook_secret.value
    google_oauth_client_id     = data.aws_ssm_parameter.google_oauth_client_id.value
    google_oauth_client_secret = data.aws_ssm_parameter.google_oauth_client_secret.value
  }
}

# ── Route 53 — apex + www A records pointing at the EC2 EIP ──────────────────

module "route53" {
  source = "./modules/route53"
  count  = var.create_route53_records ? 1 : 0

  domain_name = var.domain_name
  zone_id     = var.route53_zone_id
  eip_address = module.ec2.public_ip
}

# ── Cognito — user pool + Google IdP + web app client ────────────────────────
# Owns user identity for the multi-household SaaS. The Go backend validates
# Cognito-issued JWTs; the Next.js frontend drives the OIDC Authorization Code
# + PKCE flow. Google secrets are pulled from the same SSM path populated by
# scripts/put-ssm-params.sh.

module "cognito" {
  source = "./modules/cognito"

  project     = var.project
  environment = var.environment
  domain_name = var.domain_name

  google_client_id     = data.aws_ssm_parameter.google_oauth_client_id.value
  google_client_secret = data.aws_ssm_parameter.google_oauth_client_secret.value
}

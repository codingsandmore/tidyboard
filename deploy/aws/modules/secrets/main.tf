locals {
  name_prefix = "${var.project}-${var.environment}"
}

# ── JWT Secret ────────────────────────────────────────────────────────────────

resource "aws_secretsmanager_secret" "jwt" {
  name                    = "${local.name_prefix}/auth/jwt-secret"
  description             = "Tidyboard JWT signing secret (TIDYBOARD_AUTH_JWT_SECRET)"
  recovery_window_in_days = 7

  tags = {
    Name = "${local.name_prefix}-jwt-secret"
  }
}

resource "aws_secretsmanager_secret_version" "jwt" {
  secret_id     = aws_secretsmanager_secret.jwt.id
  secret_string = "REPLACE_WITH_OUTPUT_OF: openssl rand -base64 64"

  lifecycle {
    # Prevent Terraform from overwriting a secret that has been manually set
    ignore_changes = [secret_string]
  }
}

# ── Database password ─────────────────────────────────────────────────────────

resource "aws_secretsmanager_secret" "db_password" {
  name                    = "${local.name_prefix}/database/password"
  description             = "Aurora PostgreSQL master password (TIDYBOARD_DATABASE_PASSWORD)"
  recovery_window_in_days = 7

  tags = {
    Name = "${local.name_prefix}-db-password"
  }
}

resource "aws_secretsmanager_secret_version" "db_password" {
  secret_id     = aws_secretsmanager_secret.db_password.id
  secret_string = "REPLACE_WITH_OUTPUT_OF: openssl rand -base64 32"

  lifecycle {
    ignore_changes = [secret_string]
  }
}

# ── Redis auth token ──────────────────────────────────────────────────────────

resource "aws_secretsmanager_secret" "redis_password" {
  name                    = "${local.name_prefix}/redis/password"
  description             = "ElastiCache Redis auth token (TIDYBOARD_REDIS_PASSWORD)"
  recovery_window_in_days = 7

  tags = {
    Name = "${local.name_prefix}-redis-password"
  }
}

resource "aws_secretsmanager_secret_version" "redis_password" {
  secret_id     = aws_secretsmanager_secret.redis_password.id
  secret_string = "REPLACE_WITH_OUTPUT_OF: openssl rand -base64 32"

  lifecycle {
    ignore_changes = [secret_string]
  }
}

# ── Stripe secret key ─────────────────────────────────────────────────────────

resource "aws_secretsmanager_secret" "stripe_secret_key" {
  name                    = "${local.name_prefix}/stripe/secret-key"
  description             = "Stripe secret key (TIDYBOARD_STRIPE_SECRET_KEY)"
  recovery_window_in_days = 7

  tags = {
    Name = "${local.name_prefix}-stripe-secret-key"
  }
}

resource "aws_secretsmanager_secret_version" "stripe_secret_key" {
  secret_id     = aws_secretsmanager_secret.stripe_secret_key.id
  secret_string = "sk_live_REPLACE_ME"

  lifecycle {
    ignore_changes = [secret_string]
  }
}

# ── Stripe webhook secret ─────────────────────────────────────────────────────

resource "aws_secretsmanager_secret" "stripe_webhook_secret" {
  name                    = "${local.name_prefix}/stripe/webhook-secret"
  description             = "Stripe webhook signing secret (TIDYBOARD_STRIPE_WEBHOOK_SECRET)"
  recovery_window_in_days = 7

  tags = {
    Name = "${local.name_prefix}-stripe-webhook-secret"
  }
}

resource "aws_secretsmanager_secret_version" "stripe_webhook_secret" {
  secret_id     = aws_secretsmanager_secret.stripe_webhook_secret.id
  secret_string = "whsec_REPLACE_ME"

  lifecycle {
    ignore_changes = [secret_string]
  }
}

# ── Google OAuth client ID ────────────────────────────────────────────────────

resource "aws_secretsmanager_secret" "google_client_id" {
  name                    = "${local.name_prefix}/oauth/google-client-id"
  description             = "Google OAuth client ID (TIDYBOARD_AUTH_OAUTH_GOOGLE_CLIENT_ID)"
  recovery_window_in_days = 7

  tags = {
    Name = "${local.name_prefix}-google-client-id"
  }
}

resource "aws_secretsmanager_secret_version" "google_client_id" {
  secret_id     = aws_secretsmanager_secret.google_client_id.id
  secret_string = "REPLACE_ME"

  lifecycle {
    ignore_changes = [secret_string]
  }
}

# ── Google OAuth client secret ────────────────────────────────────────────────

resource "aws_secretsmanager_secret" "google_client_secret" {
  name                    = "${local.name_prefix}/oauth/google-client-secret"
  description             = "Google OAuth client secret (TIDYBOARD_AUTH_OAUTH_GOOGLE_CLIENT_SECRET)"
  recovery_window_in_days = 7

  tags = {
    Name = "${local.name_prefix}-google-client-secret"
  }
}

resource "aws_secretsmanager_secret_version" "google_client_secret" {
  secret_id     = aws_secretsmanager_secret.google_client_secret.id
  secret_string = "REPLACE_ME"

  lifecycle {
    ignore_changes = [secret_string]
  }
}

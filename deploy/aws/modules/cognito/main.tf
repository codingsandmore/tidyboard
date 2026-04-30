# Cognito user pool + Google IdP federation + web app client.
# See ../../../ARCHITECTURE.md (coming) for the end-to-end auth flow.
#
# Policy choices baked in:
#   - Sign-in alias: email only (no username, no phone)
#   - Email verification: required (Cognito sends a code; user confirms before first login)
#   - MFA: optional, TOTP only (SMS is expensive and opt-in per user in Settings)
#   - Password policy: Cognito default (8 chars, 1 upper, 1 lower, 1 number, 1 symbol)
#   - Schema: email + name + picture (Google fills all three for free; Cognito accepts them)
#   - Token expiry: access 1h, id 1h, refresh 30d (SaaS-sane balance)

locals {
  name_prefix = "${var.project}-${var.environment}"
}

resource "aws_cognito_user_pool" "main" {
  name = "${local.name_prefix}-users"

  # Sign-in identifiers
  alias_attributes         = ["email"]
  auto_verified_attributes = ["email"]

  # Email verification required before first login
  verification_message_template {
    default_email_option  = "CONFIRM_WITH_LINK"
    email_subject_by_link = "Confirm your Tidyboard account"
    email_message_by_link = "Welcome to Tidyboard! Confirm your email: {##Verify Email##}"
  }

  # Optional TOTP MFA — users enable in Settings
  mfa_configuration = "OPTIONAL"
  software_token_mfa_configuration {
    enabled = true
  }

  password_policy {
    minimum_length                   = 8
    require_uppercase                = true
    require_lowercase                = true
    require_numbers                  = true
    require_symbols                  = true
    temporary_password_validity_days = 7
  }

  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }

  admin_create_user_config {
    allow_admin_create_user_only = false
  }

  # Core schema. `email` + `name` are standard OIDC claims; `picture` lets us
  # surface the Google avatar in the web UI without a second API call.
  schema {
    name                     = "email"
    attribute_data_type      = "String"
    required                 = true
    mutable                  = true
    developer_only_attribute = false
    string_attribute_constraints {
      min_length = 1
      max_length = 256
    }
  }

  schema {
    name                     = "name"
    attribute_data_type      = "String"
    required                 = true
    mutable                  = true
    developer_only_attribute = false
    string_attribute_constraints {
      min_length = 1
      max_length = 256
    }
  }

  schema {
    name                     = "picture"
    attribute_data_type      = "String"
    required                 = false
    mutable                  = true
    developer_only_attribute = false
    string_attribute_constraints {
      min_length = 0
      max_length = 2048
    }
  }

  # Let Cognito manage the from-address; upgrade to SES later for branded sender.
  email_configuration {
    email_sending_account = "COGNITO_DEFAULT"
  }

  tags = {
    Name = "${local.name_prefix}-users"
  }

  lifecycle {
    # Re-creating the pool loses every user. Changing schema later requires careful
    # migration (Cognito doesn't allow dropping required attributes).
    prevent_destroy = true
  }
}

# Google federation. Gated behind real-creds-present check so the first apply
# can stand up the user pool before Google Cloud Console is configured (which
# needs the Cognito domain to complete). Once the SSM params hold real values,
# a second `terraform apply` adds the IdP and updates the app client.
#
# Attribute mapping pulls Google's standard OIDC claims into Cognito's attrs;
# Cognito then issues its own tokens to the client (the client never sees
# Google tokens directly).
locals {
  google_creds_ready = (
    var.google_client_id != "" &&
    var.google_client_id != "unset" &&
    var.google_client_secret != "" &&
    var.google_client_secret != "unset"
  )
}

resource "aws_cognito_identity_provider" "google" {
  count = local.google_creds_ready ? 1 : 0

  user_pool_id  = aws_cognito_user_pool.main.id
  provider_name = "Google"
  provider_type = "Google"

  provider_details = {
    client_id        = var.google_client_id
    client_secret    = var.google_client_secret
    authorize_scopes = "openid email profile"
  }

  attribute_mapping = {
    email    = "email"
    name     = "name"
    picture  = "picture"
    username = "sub"
  }
}

# Hosted-UI-capable domain on the Cognito-owned subdomain. Vanity subdomain
# (auth.tidyboard.org) would require an ACM cert in us-east-1 + Route 53 A record
# — deferred to v1.1. The prefix must be globally unique within us-east-1.
resource "aws_cognito_user_pool_domain" "main" {
  domain       = "${var.project}-${var.environment}"
  user_pool_id = aws_cognito_user_pool.main.id
}

# Web app client — public (no secret), PKCE enforced, OAuth Authorization Code
# flow only. Do NOT add a secret: single-page apps can't store it safely.
resource "aws_cognito_user_pool_client" "web" {
  name         = "${local.name_prefix}-web"
  user_pool_id = aws_cognito_user_pool.main.id

  generate_secret = false

  # Federated IdPs this client is allowed to invoke. Google appears only when
  # the IdP resource is active (real Google creds in SSM).
  supported_identity_providers = local.google_creds_ready ? ["COGNITO", "Google"] : ["COGNITO"]

  # OIDC Authorization Code + PKCE (standard for SPAs)
  allowed_oauth_flows                  = ["code"]
  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_scopes                 = ["openid", "email", "profile"]

  callback_urls = [
    "https://${var.domain_name}/auth/callback",
    "http://localhost:3000/auth/callback", # local dev
  ]
  logout_urls = [
    "https://${var.domain_name}/",
    "http://localhost:3000/",
  ]

  # Explicit auth flows for server-side scripting + tests; the UI still uses OIDC code flow.
  explicit_auth_flows = [
    "ALLOW_USER_SRP_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
  ]

  # Token lifetimes
  access_token_validity  = 60
  id_token_validity      = 60
  refresh_token_validity = 30
  token_validity_units {
    access_token  = "minutes"
    id_token      = "minutes"
    refresh_token = "days"
  }

  prevent_user_existence_errors = "ENABLED"

  # Necessary so `supported_identity_providers` actually takes effect — terraform
  # otherwise races the IdP creation. `depends_on` on a counted resource is fine;
  # when count=0 it resolves to an empty list.
  depends_on = [aws_cognito_identity_provider.google]
}

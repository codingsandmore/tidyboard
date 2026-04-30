#!/usr/bin/env bash
# put-ssm-params.sh — interactively write Tidyboard secrets to SSM Parameter Store.
#
# Usage:
#   ./scripts/put-ssm-params.sh [--profile <aws-profile>] [--region <region>] [--env <environment>]
#
# Each parameter is stored as a SecureString under /tidyboard/<env>/<name>.
# The EC2 instance role reads them at boot time via GetParametersByPath.
# SSM Parameter Store is free for standard parameters (no cost vs Secrets Manager).

set -euo pipefail

PROFILE="${AWS_PROFILE:-home}"
REGION="${AWS_DEFAULT_REGION:-us-east-1}"
ENV="prod"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --profile) PROFILE="$2"; shift 2 ;;
    --region)  REGION="$2";  shift 2 ;;
    --env)     ENV="$2";     shift 2 ;;
    *) echo "Unknown flag: $1"; exit 1 ;;
  esac
done

PREFIX="/tidyboard/${ENV}"

put_param() {
  local name="$1"
  local description="$2"
  local optional="${3:-false}"
  local path="${PREFIX}/${name}"

  if [[ "$optional" == "true" ]]; then
    read -r -p "  ${name} [optional, press Enter to skip]: " value
    [[ -z "$value" ]] && echo "  Skipping ${name}." && return 0
  else
    while true; do
      read -r -s -p "  ${name}: " value
      echo
      [[ -n "$value" ]] && break
      echo "  Value cannot be empty. Try again."
    done
  fi

  aws ssm put-parameter \
    --profile "$PROFILE" \
    --region  "$REGION" \
    --name    "$path" \
    --value   "$value" \
    --type    SecureString \
    --description "$description" \
    --overwrite \
    --no-cli-pager \
    --output text > /dev/null

  echo "  Wrote $path"
}

echo ""
echo "Tidyboard SSM Parameter Store setup"
echo "Profile : $PROFILE"
echo "Region  : $REGION"
echo "Path    : $PREFIX/*"
echo ""
echo "Enter values when prompted. Optional params can be left blank."
echo "---------------------------------------------------------------"
echo ""

echo "[Required]"
put_param "db-password"  "Tidyboard PostgreSQL role password (set by bootstrap-db.sh)"
put_param "jwt-secret"   "JWT signing secret — use 'openssl rand -hex 32' to generate"

echo ""
echo "[Optional — Stripe billing]"
put_param "stripe-secret-key"      "Stripe secret key (sk_live_...)"     true
put_param "stripe-webhook-secret"  "Stripe webhook signing secret"        true

echo ""
echo "[Optional — Google OAuth]"
put_param "google-oauth-client-id"      "Google OAuth 2.0 client ID"     true
put_param "google-oauth-client-secret"  "Google OAuth 2.0 client secret" true

echo ""
echo "Done. Parameters written to $PREFIX/*"
echo ""
echo "Verify with:"
echo "  aws ssm get-parameters-by-path --profile $PROFILE --region $REGION \\"
echo "    --path $PREFIX/ --with-decryption --query 'Parameters[*].Name'"

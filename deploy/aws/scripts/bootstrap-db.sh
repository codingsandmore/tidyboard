#!/usr/bin/env bash
# bootstrap-db.sh — One-time setup of the tidyboard role + schema in cutly-db.
#
# Prerequisites:
#   - psql on PATH
#   - AWS CLI configured with the "home" profile (account 812063707282)
#   - The tidyboard role password already written to SSM at
#     /tidyboard/prod/db-password (see scripts/put-ssm-params.sh)
#
# What it does:
#   1. Reads the tidyboard DB password from SSM Parameter Store.
#   2. Prompts you for the RDS master user password (never stored).
#   3. Runs bootstrap-db.sql against cutly-db as the master user.
#
# After this script succeeds, the EC2 app can connect as `tidyboard` and all
# CREATE TABLE statements land in the `tidyboard` schema automatically.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SQL_FILE="${SCRIPT_DIR}/bootstrap-db.sql"

# ── Configuration ─────────────────────────────────────────────────────────────

AWS_PROFILE="${AWS_PROFILE:-home}"
AWS_REGION="${AWS_REGION:-us-east-1}"
SSM_PARAM="/tidyboard/prod/db-password"
DB_HOST="cutly-db.c858qwm0sac7.us-east-1.rds.amazonaws.com"
DB_PORT="5432"
DB_NAME="cutlist"        # RDS DBName field, not the instance identifier
MASTER_USER="cutlist"    # RDS MasterUsername for cutly-db

# ── Fetch the tidyboard role password from SSM Parameter Store ────────────────

echo "Fetching tidyboard DB password from SSM (profile: ${AWS_PROFILE}, region: ${AWS_REGION})..."
TIDYBOARD_PASSWORD=$(
  aws --profile "${AWS_PROFILE}" --region "${AWS_REGION}" ssm get-parameter \
    --name "${SSM_PARAM}" \
    --with-decryption \
    --query 'Parameter.Value' \
    --output text
)

if [[ -z "${TIDYBOARD_PASSWORD}" ]]; then
  echo "ERROR: SSM parameter '${SSM_PARAM}' is empty. Set it first via:"
  echo "  ./scripts/put-ssm-params.sh --profile ${AWS_PROFILE} --region ${AWS_REGION}"
  exit 1
fi

# ── Substitute the password placeholder into a temp SQL file ──────────────────

TMP_SQL=$(mktemp /tmp/bootstrap-db-XXXXXX.sql)
trap 'rm -f "${TMP_SQL}"' EXIT

sed "s/TIDYBOARD_DB_PASSWORD_PLACEHOLDER/${TIDYBOARD_PASSWORD}/g" \
  "${SQL_FILE}" > "${TMP_SQL}"

# ── Run as master user (password prompted interactively — never stored) ───────

echo ""
echo "Connecting to ${DB_HOST}:${DB_PORT}/${DB_NAME} as ${MASTER_USER}."
echo "You will be prompted for the RDS master user password."
echo ""

PGPASSWORD="" psql \
  "postgres://${MASTER_USER}@${DB_HOST}:${DB_PORT}/${DB_NAME}?sslmode=require" \
  -f "${TMP_SQL}"

echo ""
echo "Bootstrap complete. The tidyboard role and schema are ready."
echo "Next: run 'terraform apply' if not already done, then force-redeploy ECS services."

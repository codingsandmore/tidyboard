#!/usr/bin/env bash
# deploy.sh — Apply Terraform and force ECS service redeployments.
#
# Usage (from repo root or deploy/aws/):
#   ./deploy/aws/scripts/deploy.sh [image-tag]
#
# Steps:
#   1. terraform init + apply
#   2. Build and push Docker images (calls build-and-push.sh)
#   3. Force ECS service redeployments so tasks pick up the new images

set -euo pipefail

PROFILE="${AWS_PROFILE:-tidyboard}"
REGION="${AWS_REGION:-us-east-1}"
TAG="${1:-latest}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TF_DIR="${SCRIPT_DIR}/.."

# ── 1. Terraform ──────────────────────────────────────────────────────────────

echo "==> Terraform init"
terraform -chdir="${TF_DIR}" init -upgrade

echo ""
echo "==> Terraform plan"
terraform -chdir="${TF_DIR}" plan -out="${TF_DIR}/.tfplan"

echo ""
echo "==> Terraform apply"
terraform -chdir="${TF_DIR}" apply "${TF_DIR}/.tfplan"

# ── 2. Read cluster name from Terraform output ────────────────────────────────

CLUSTER=$(terraform -chdir="${TF_DIR}" output -raw ecs_cluster_name)
echo ""
echo "==> ECS cluster: ${CLUSTER}"

# ── 3. Build and push images ──────────────────────────────────────────────────

echo ""
echo "==> Building and pushing Docker images (tag: ${TAG})"
"${SCRIPT_DIR}/build-and-push.sh" "${TAG}"

# ── 4. Force ECS service redeployments ───────────────────────────────────────

services=(
  "${CLUSTER}-server"
  "${CLUSTER}-web"
  "${CLUSTER}-sync-worker"
  "${CLUSTER}-recipe-scraper"
)

for svc in "${services[@]}"; do
  echo ""
  echo "==> Force redeploying ECS service: ${svc}"
  aws --profile "${PROFILE}" --region "${REGION}" ecs update-service \
    --cluster "${CLUSTER}" \
    --service "${svc}" \
    --force-new-deployment \
    --query 'service.serviceName' \
    --output text
done

echo ""
echo "==> Deploy complete. Services are redeploying."
echo "    Monitor progress:"
echo "    aws --profile ${PROFILE} --region ${REGION} ecs describe-services \\"
echo "      --cluster ${CLUSTER} --services ${services[*]}"

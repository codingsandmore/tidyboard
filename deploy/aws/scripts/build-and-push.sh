#!/usr/bin/env bash
# build-and-push.sh — Build all Tidyboard Docker images for linux/amd64 (Fargate)
# and push them to ECR.
#
# Usage:
#   ./deploy/aws/scripts/build-and-push.sh [image-tag]
#
# Default tag: "latest". Pass a git SHA or semver for pinned deployments:
#   ./deploy/aws/scripts/build-and-push.sh sha-$(git rev-parse --short HEAD)
#
# Requirements:
#   - AWS named profile configured (see README.md)
#   - Docker with buildx plugin installed
#   - docker buildx create --use (run once to initialise a buildx builder)

set -euo pipefail

PROFILE="${AWS_PROFILE:-tidyboard}"
REGION="${AWS_REGION:-us-east-1}"
TAG="${1:-latest}"

# ── Derive registry URL from caller identity ──────────────────────────────────

ACCOUNT=$(aws --profile "$PROFILE" --region "$REGION" \
  sts get-caller-identity --query Account --output text)
REGISTRY="${ACCOUNT}.dkr.ecr.${REGION}.amazonaws.com"

echo "==> Logging in to ECR: ${REGISTRY}"
aws --profile "$PROFILE" --region "$REGION" ecr get-login-password \
  | docker login --username AWS --password-stdin "$REGISTRY"

# ── Repo root (two directories up from this script) ───────────────────────────

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"

build_and_push() {
  local name="$1"
  local context="$2"
  local uri="${REGISTRY}/${name}:${TAG}"

  echo ""
  echo "==> Building ${name}:${TAG} from ${context}"
  docker buildx build \
    --platform linux/amd64 \
    --provenance=false \
    -t "${uri}" \
    --push \
    "${context}"

  echo "    Pushed: ${uri}"
}

# Build order: server first (largest, longest build — fail fast)
build_and_push "tidyboard-server"         "${REPO_ROOT}"
build_and_push "tidyboard-web"            "${REPO_ROOT}/web"
build_and_push "tidyboard-sync-worker"    "${REPO_ROOT}/services/sync-worker"
build_and_push "tidyboard-recipe-scraper" "${REPO_ROOT}/services/recipe-scraper"

echo ""
echo "==> All images pushed with tag: ${TAG}"
echo "    Registry: ${REGISTRY}"

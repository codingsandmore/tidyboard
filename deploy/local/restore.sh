#!/usr/bin/env bash
# deploy/local/restore.sh — restore a local-mode backup bundle.
#
# Source spec: docs/superpowers/specs/2026-04-30-local-production-mode-design.md
# Issue: https://github.com/codingsandmore/tidyboard/issues/79
#
# Usage:
#   deploy/local/restore.sh <bundle-filename-or-path>
#
# The script:
#   1. Confirms the supplied bundle exists in the `tidyboard-backups` volume.
#   2. Stops the API + web services so nothing writes to the DB during restore.
#   3. Runs `tidyboard backup restore <file>` against postgres + the media
#      volume.
#   4. Restarts the API + web services.
#
# Postgres + Redis stay up the whole time so the restore CLI can connect.

set -euo pipefail

if [ $# -lt 1 ]; then
    echo "Usage: $0 <bundle-filename-or-path>" >&2
    echo "Example: $0 tidyboard-local-2026-04-30-120000.tar.gz" >&2
    exit 2
fi

BUNDLE="$1"

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$PROJECT_ROOT"

COMPOSE_FILES=(-f docker-compose.yml -f docker-compose.local.yml)

# Resolve the bundle path inside the container. If the caller passed a bare
# filename, look it up under /app/data/backups (the mounted volume).
case "$BUNDLE" in
    /*) CONTAINER_PATH="$BUNDLE" ;;
    *)  CONTAINER_PATH="/app/data/backups/$BUNDLE" ;;
esac

# Confirm the bundle exists. Use the postgres container (always up) to peek at
# the volume — but `tidyboard-backups` is only mounted into the API
# container, so check via that. We start a one-off container if needed.
if docker compose "${COMPOSE_FILES[@]}" ps --status running --services 2>/dev/null \
        | grep -q '^tidyboard$'; then
    if ! docker compose "${COMPOSE_FILES[@]}" exec -T tidyboard test -f "$CONTAINER_PATH"; then
        echo "deploy/local/restore.sh: bundle not found at $CONTAINER_PATH" >&2
        echo "List available bundles: make backup-local-list" >&2
        exit 1
    fi
fi

echo "deploy/local/restore.sh: stopping API + web services…" >&2
docker compose "${COMPOSE_FILES[@]}" stop tidyboard web sync-worker recipe-scraper 2>/dev/null || true

echo "deploy/local/restore.sh: ensuring postgres + redis are up…" >&2
docker compose "${COMPOSE_FILES[@]}" up -d postgres redis

# Wait for postgres to be ready.
for _ in $(seq 1 30); do
    if docker compose "${COMPOSE_FILES[@]}" exec -T postgres pg_isready -U "${TIDYBOARD_DB_USER:-tidyboard}" >/dev/null 2>&1; then
        break
    fi
    sleep 1
done

# Run the restore inside a one-off tidyboard container — `--rm` cleans up
# afterward, and `run --no-deps` avoids re-creating the API service we just
# stopped.
echo "deploy/local/restore.sh: running restore from $CONTAINER_PATH…" >&2
docker compose "${COMPOSE_FILES[@]}" run --rm --no-deps tidyboard \
    ./tidyboard backup restore "$CONTAINER_PATH"

echo "deploy/local/restore.sh: restarting API + web services…" >&2
docker compose "${COMPOSE_FILES[@]}" up -d

echo "deploy/local/restore.sh: done. Verify with: curl -fsS http://localhost:8080/health" >&2

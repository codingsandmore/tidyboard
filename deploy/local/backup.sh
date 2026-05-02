#!/usr/bin/env bash
# deploy/local/backup.sh — create a local-mode backup bundle.
#
# Source spec: docs/superpowers/specs/2026-04-30-local-production-mode-design.md
# Issue: https://github.com/codingsandmore/tidyboard/issues/79
#
# Runs `tidyboard backup create` *inside* the running tidyboard container so
# the bundle lands directly in the `tidyboard-backups` named volume mounted at
# /app/data/backups. The container has the configured DATABASE/STORAGE/BACKUP
# settings already, so the script does not need to know them.
#
# Output: the absolute container-path of the created bundle (printed by the
# Go CLI on stdout). Exits non-zero on failure.

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$PROJECT_ROOT"

COMPOSE_FILES=(-f docker-compose.yml -f docker-compose.local.yml)

# Verify the local-mode stack is up — backup pulls live data from postgres so
# we need the API container's pg_dump + tidyboard binary running.
if ! docker compose "${COMPOSE_FILES[@]}" ps --status running --services 2>/dev/null \
        | grep -q '^tidyboard$'; then
    echo "deploy/local/backup.sh: the tidyboard service is not running." >&2
    echo "Start the stack first: make compose-local-up" >&2
    exit 1
fi

echo "deploy/local/backup.sh: creating bundle…" >&2
docker compose "${COMPOSE_FILES[@]}" exec -T tidyboard ./tidyboard backup create

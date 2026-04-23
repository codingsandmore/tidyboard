.PHONY: up down logs migrate seed web-dev web-build test lint \
        loadtest-smoke loadtest-load loadtest-stress loadtest-soak \
        loadtest-spike loadtest-auth loadtest-events loadtest-baseline \
        e2e-real help

# Default goal
.DEFAULT_GOAL := help

# ── Docker Compose ────────────────────────────────────────────────────────────

## up: Start all services in the background
up:
	docker compose up -d

## down: Stop and remove containers (volumes preserved)
down:
	docker compose down

## logs: Tail logs from all services (Ctrl-C to stop)
logs:
	docker compose logs -f

# ── Database ──────────────────────────────────────────────────────────────────

## migrate: Run goose migrations (up) against the running Postgres container
migrate:
	docker compose run --rm \
		-e GOOSE_DRIVER=postgres \
		-e GOOSE_DBSTRING="host=postgres port=5432 dbname=tidyboard user=tidyboard password=$${TIDYBOARD_DB_PASSWORD:-tidyboard_dev_password} sslmode=disable" \
		tidyboard migrate up

## seed: Load the Smith family sample data into Postgres
seed:
	docker compose exec postgres \
		psql -U tidyboard -d tidyboard -f /dev/stdin < sql/seed/smith_family.sql

# ── Web frontend ──────────────────────────────────────────────────────────────

## web-dev: Start the Next.js dev server
web-dev:
	cd web && npm run dev

## web-build: Build the Next.js production bundle
web-build:
	cd web && npm run build

# ── Testing ───────────────────────────────────────────────────────────────────

## test: Run Go unit tests and Python tests
test: test-go test-python

test-go:
	go test -p 1 -count=1 -race -tags unit ./...

test-python:
	cd services/sync-worker && python -m pytest -p no:parallel -x tests/
	cd services/recipe-scraper && python -m pytest -p no:parallel -x tests/

# ── Linting ───────────────────────────────────────────────────────────────────

## lint: Run Go vet and Python ruff linter
lint: lint-go lint-python

lint-go:
	go vet ./...

lint-python:
	# TODO: install ruff if not present: pip install ruff
	cd services/sync-worker && ruff check src/
	cd services/recipe-scraper && ruff check src/

# ── Load Tests ───────────────────────────────────────────────────────────────
# Requires k6: brew install k6
# Server must be running: make up

LOADTEST_BASE_URL ?= http://localhost:8080
LOADTEST_REPORTS  := loadtest/reports

## loadtest-smoke: 1 VU, 30 s — sanity check (k6 required)
loadtest-smoke:
	k6 run loadtest/smoke.js -e BASE_URL=$(LOADTEST_BASE_URL)

## loadtest-load: Ramp 0→50 VU, steady 5 m, ramp down — baseline (k6 required)
loadtest-load:
	k6 run loadtest/load.js -e BASE_URL=$(LOADTEST_BASE_URL)

## loadtest-stress: Ramp 0→500 VU — find breaking point (k6 required)
loadtest-stress:
	k6 run loadtest/stress.js -e BASE_URL=$(LOADTEST_BASE_URL)

## loadtest-soak: 20 VU for 2 h — memory/connection leak detection (k6 required)
loadtest-soak:
	k6 run loadtest/soak.js -e BASE_URL=$(LOADTEST_BASE_URL)

## loadtest-spike: 10→200→10 VU traffic spike (k6 required)
loadtest-spike:
	k6 run loadtest/spike.js -e BASE_URL=$(LOADTEST_BASE_URL)

## loadtest-auth: Hammer /v1/auth/* endpoints (k6 required)
loadtest-auth:
	k6 run loadtest/auth.js -e BASE_URL=$(LOADTEST_BASE_URL)

## loadtest-events: /v1/events CRUD + range queries (k6 required)
loadtest-events:
	k6 run loadtest/events.js -e BASE_URL=$(LOADTEST_BASE_URL)

## loadtest-baseline: Run smoke + load and save JSON report to loadtest/reports/
loadtest-baseline:
	@mkdir -p $(LOADTEST_REPORTS)
	@TIMESTAMP=$$(date +%Y%m%d-%H%M%S) && \
	echo "Running smoke test..." && \
	k6 run loadtest/smoke.js -e BASE_URL=$(LOADTEST_BASE_URL) \
	    --out json=$(LOADTEST_REPORTS)/baseline-smoke-$$TIMESTAMP.json && \
	echo "Running load test..." && \
	k6 run loadtest/load.js  -e BASE_URL=$(LOADTEST_BASE_URL) \
	    --out json=$(LOADTEST_REPORTS)/baseline-load-$$TIMESTAMP.json && \
	echo "Baseline reports saved to $(LOADTEST_REPORTS)/"

# ── Real-stack E2E ────────────────────────────────────────────────────────────

## e2e-real: Run Playwright real-stack e2e tests (requires Docker)
e2e-real:
	@echo "==> Starting Docker stack (fresh volumes)…"
	docker compose down -v --remove-orphans 2>/dev/null || true
	docker compose up -d postgres redis
	@echo "==> Waiting for postgres…"
	@until docker compose exec -T postgres pg_isready -U tidyboard -d tidyboard >/dev/null 2>&1; do \
		printf '.'; sleep 1; done; echo " ready"
	@echo "==> Running migrations…"
	$(MAKE) migrate
	@echo "==> Starting Go server (TIDYBOARD_ALLOW_RESET=true)…"
	TIDYBOARD_ALLOW_RESET=true \
	TIDYBOARD_DATABASE_HOST=localhost \
	TIDYBOARD_DATABASE_PORT=5432 \
	TIDYBOARD_DATABASE_NAME=tidyboard \
	TIDYBOARD_DATABASE_USER=tidyboard \
	TIDYBOARD_DATABASE_PASSWORD=$${TIDYBOARD_DB_PASSWORD:-tidyboard_dev_password} \
	TIDYBOARD_REDIS_HOST=localhost \
	TIDYBOARD_REDIS_PORT=6379 \
	TIDYBOARD_SERVER_HOST=0.0.0.0 \
	TIDYBOARD_SERVER_PORT=8080 \
	TIDYBOARD_AUTH_JWT_SECRET=$${TIDYBOARD_AUTH_JWT_SECRET:-e2e-test-jwt-secret} \
	TIDYBOARD_SERVER_CORS_ORIGINS=http://localhost:3000 \
	TIDYBOARD_BACKUP_ENABLED=false \
	go run ./cmd/server serve > /tmp/tidyboard-e2e-server.log 2>&1 & \
	echo $$! > /tmp/tidyboard-e2e-server.pid
	@echo "==> Waiting for Go server at :8080…"
	@until curl -sf http://localhost:8080/health >/dev/null 2>&1; do \
		printf '.'; sleep 1; done; echo " healthy"
	@echo "==> Running Playwright real-stack tests…"
	@trap ' \
		echo "==> Stopping Go server…"; \
		kill $$(cat /tmp/tidyboard-e2e-server.pid 2>/dev/null) 2>/dev/null || true; \
		echo "==> Stopping Docker services…"; \
		docker compose stop postgres redis 2>/dev/null || true; \
	' EXIT; \
	cd web && \
	NEXT_PUBLIC_API_URL=http://localhost:8080 \
	E2E_REAL_DOCKER_STARTED=1 \
	npm run e2e:real

# ── Help ──────────────────────────────────────────────────────────────────────

## help: Show this help message
help:
	@echo "Tidyboard Makefile targets:"
	@echo ""
	@grep -E '^## ' Makefile | sed 's/## /  /' | column -t -s ':'

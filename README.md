# Tidyboard

**Open-source family dashboard — self-hosted, privacy-first, no subscription fees.**

Tidyboard is a shared household hub for calendars, tasks, chore gamification, meal
planning, and family routines. It runs on recycled iPads, Android tablets, and any
modern browser as a Progressive Web App. Unlike Hearth Display ($699) or Skylight
Calendar ($599), Tidyboard is free, self-hosted, and puts your family's data on
your own network — not someone else's servers.

> **Status:** v0.1 in progress — backend scaffolded (Go + PostgreSQL + Redis),
> frontend in alpha (Next.js PWA). Not yet ready for production use.

---

## Quickstart

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose v2
- Node.js 20+ (for web frontend dev only)

### Start the full stack

```bash
git clone https://github.com/tidyboard/tidyboard.git
cd tidyboard

# Configure environment
cp .env.example .env
# Edit .env — at minimum set TIDYBOARD_AUTH_JWT_SECRET

# Start Postgres, Redis, Go server, Python services
make up

# Run database migrations
make migrate

# (Optional) Load Smith family sample data
make seed
```

Visit the API: http://localhost:8080/health

### Start the web frontend (dev)

```bash
make web-dev
# Opens http://localhost:3000
```

---

## Architecture

```
Browser / PWA / Tablet
        │
        │  HTTPS
        ▼
Next.js Frontend  ──────────────────►  Go API Server (port 8080)
(Vercel / self-hosted)                  chi · pgx · sqlc · JWT
                                               │
                               ┌───────────────┼───────────────┐
                               ▼               ▼               ▼
                          PostgreSQL 16     Redis 7       Python services
                          (data store)   (pub/sub,       sync-worker  :8081
                                         sessions)       recipe-scraper :8082
```

## Documentation

- [Agent Operator Manual](docs/manuals/agent-operator-manual.md) - issue, PR, CI, merge, deploy, and documentation workflow for Codex agents.
- [User Manual](docs/manuals/user-manual.md) - family-facing setup and usage guide for production Tidyboard.

| Component | Tech | Port |
|---|---|---|
| Web frontend | Next.js 16, TypeScript, Tailwind CSS | 3000 |
| API server | Go 1.23, chi, pgx, sqlc, Kong | 8080 |
| CalDAV sync | Python 3.12, python-caldav | 8081 |
| Recipe scraper | Python 3.12, recipe-scrapers | 8082 |
| Database | PostgreSQL 16 | 5432 |
| Cache / pub-sub | Redis 7 | 6379 |

---

## Project Structure

```
tidyboard/
├── cmd/server/            # Go server entry point
├── cmd/lambda/            # AWS Lambda entry points (Phase 2)
├── internal/
│   ├── config/            # Kong config struct
│   ├── handler/           # HTTP handlers (chi)
│   ├── service/           # Business logic
│   ├── model/             # Go structs
│   ├── query/             # sqlc-generated queries
│   ├── middleware/        # JWT auth, rate limiting
│   └── testutil/          # Test helpers and factories
├── migrations/            # goose SQL migrations
├── sql/
│   ├── queries/           # sqlc source SQL
│   └── seed/              # Sample data SQL
├── services/
│   ├── sync-worker/       # Python CalDAV service
│   └── recipe-scraper/    # Python recipe scraper
├── web/                   # Next.js frontend
├── specs/                 # Product specification and design docs
├── Dockerfile             # Go server multi-stage build
├── docker-compose.yml     # Full local stack
├── Makefile               # Common development tasks
├── config.example.yaml    # Reference configuration
└── .env.example           # Reference environment variables
```

---

## Make Targets

```bash
make up           # Start all services (docker compose up -d)
make down         # Stop all services
make logs         # Tail logs from all services
make migrate      # Run goose migrations
make seed         # Load Smith family sample data
make web-dev      # Start Next.js dev server
make web-build    # Build Next.js production bundle
make test         # Run Go + Python tests
make lint         # go vet + ruff
make help         # Show all targets
```

---

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for full deployment documentation:

- **Self-hosted** — Docker Compose on a VM with Caddy reverse proxy
- **Vercel + managed Postgres** — frontend on Vercel, backend on any host
- **AWS Lambda** — cloud-native serverless (Phase 2)

Web-specific deployment: [web/DEPLOY_WEB.md](web/DEPLOY_WEB.md)

---

## Configuration

Copy `.env.example` to `.env` and `config.example.yaml` to `config.yaml`.

Key variables:

| Variable | Required | Description |
|---|---|---|
| `TIDYBOARD_AUTH_JWT_SECRET` | Yes | JWT signing secret (`openssl rand -base64 64`) |
| `TIDYBOARD_DB_PASSWORD` | Yes | PostgreSQL password |
| `NEXT_PUBLIC_API_URL` | Yes (web) | Go API server public URL |

---

## Contributing

Tidyboard is in early development. Contributions are welcome.

- Read [specs/CLAUDE.md](specs/CLAUDE.md) for code conventions and architecture decisions.
- Read [specs/tidyboard-spec.md](specs/tidyboard-spec.md) for the full product specification.
- Follow conventional commits: `feat:`, `fix:`, `test:`, `docs:`, `chore:`.
- Tests: `make test`; no parallel tests; use `//go:build unit` or `//go:build integration` tags.

---

## Backend Development

The Go backend lives in `cmd/server/` and `internal/`. It compiles to a single binary that serves all API routes.

### First-time backend setup

```bash
# 1. Install tools
go install github.com/pressly/goose/v3/cmd/goose@latest
go install github.com/sqlc-dev/sqlc/cmd/sqlc@latest

# 2. Copy config and set secrets
cp config.example.yaml config.yaml
# Edit config.yaml — set auth.jwt_secret and database.password
# Or use env vars: TIDYBOARD_AUTH_JWT_SECRET, TIDYBOARD_DATABASE_PASSWORD

# 3. Run migrations (Postgres must be running)
make migrate

# 4. Generate sqlc query code from sql/queries/*.sql
make sqlc

# 5. Build and run
make build
./bin/tidyboard serve
# or:
go run ./cmd/server serve
```

### Backend-only tests (no Postgres)

```bash
go test -p 1 -count=1 -race -tags=unit ./...
```

### Integration tests (require Postgres)

```bash
export TIDYBOARD_TEST_DSN="host=localhost dbname=tidyboard user=tidyboard password=secret sslmode=disable"
go test -p 1 -count=1 -race -tags=integration ./...
```

### Verify the server is up

```bash
curl http://localhost:8080/health
# {"status":"ok","timestamp":"...","version":"dev"}
```

### CLI help

```bash
go run ./cmd/server --help
go run ./cmd/server serve --help
```

### sqlc workflow

SQL queries live in `sql/queries/*.sql` with `-- name: QueryName :one/:many/:exec` annotations.
After editing any `.sql` file, regenerate Go code:

```bash
make sqlc   # writes internal/query/*.go
```

See `internal/query/README.md` for details.

### Backend status

See [BACKEND_STATUS.md](BACKEND_STATUS.md) for what works end-to-end vs. what is stubbed (501 Not Implemented) vs. what is still to do.

---

## License

[AGPL-3.0](https://www.gnu.org/licenses/agpl-3.0.html) — free to use, modify,
and self-host. Cloud billing code lives in a separate private repository.

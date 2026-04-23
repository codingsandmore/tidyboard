# Tidyboard — Project Context for AI Coding Agents

> This file is read by Claude Code (CLAUDE.md) and Codex (AGENTS.md) at session start.
> It provides the essential context for AI-assisted development.
> Full spec: docs/tidyboard-spec.md (~3100 lines)

## What is Tidyboard?

Open-source family dashboard — calendar, routines, chore gamification, recipe database, meal planning, shopping lists, household equity tracking (task ownership + time tracking for adults). Competes with Hearth Display ($699) and Skylight Calendar ($599) as a free, self-hosted alternative with an optional managed cloud service.

## Architecture (Polyglot Lambda)

- **Go core** (chi router, pgx, sqlc, Kong CLI) — all real-time API: auth, households, events, lists, routines, gamification, equity, admin, WebSocket
- **Python services** (separate containers/Lambdas) — calendar sync (python-caldav v3, icalendar, dateutil.rrule) and recipe scraper (recipe-scrapers, beautifulsoup4). Python code lives ONLY in services/ directory.
- **React/TypeScript frontend** — Vite, Tailwind CSS 4, shadcn/ui, Radix UI, Zustand, TanStack Query
- **PostgreSQL** (Aurora Serverless v2 on cloud, local Postgres for self-hosted) via RDS Proxy
- **Redis** — WebSocket pub/sub, rate limiting, session cache
- **Dual deploy**: Lambda + API Gateway (cloud) OR single Go binary + Python sidecars via Docker Compose (self-hosted)

## Key Technical Decisions

- **Database**: PostgreSQL only. No DynamoDB. No SQLite. No ORM.
- **Query layer**: sqlc — write raw SQL in sql/queries/*.sql, generate Go code. Every query must include household_id filter.
- **Migrations**: goose — SQL files in migrations/
- **Config**: Kong (alecthomas/kong) + kong-yaml. Single Config struct, YAML file + env vars + CLI flags.
- **Tests**: Sequential only. `go test -p 1 -count=1 -race`. No parallel. Build tags: `//go:build unit`, `//go:build integration`.
- **Python tests**: pytest, sequential (-p no:parallel -x). testcontainers-python for DB.
- **AI features**: BYOK only. Tidyboard never pays for AI. Users provide their own API keys.
- **License**: AGPL-3.0 for open source. Cloud billing code in separate private repo.

## Project Layout

```
tidyboard/
├── cmd/server/main.go           # standalone server (self-hosted)
├── cmd/lambda/*/main.go         # Lambda entry points (16 functions)
├── internal/
│   ├── config/                  # Kong config struct
│   ├── model/                   # Go structs (match DB schema)
│   ├── query/                   # sqlc-generated code
│   ├── handler/                 # chi HTTP handlers by domain
│   ├── service/                 # business logic
│   │   (includes: calendar, event, list, routine, race, reward,
│   │    recipe, shopping, ingredient_matcher, equity, time_entry,
│   │    auth, invite, audit, backup, notification)
│   ├── sync/                    # sync adapter interface (Go side)
│   ├── middleware/              # JWT auth, rate limiting, household scoping
│   ├── broadcast/               # WebSocket pub/sub
│   └── testutil/                # factories, test DB setup, JWT helpers
├── sql/queries/*.sql            # sqlc source SQL
├── migrations/*.sql             # goose migrations
├── services/
│   ├── sync-worker/             # Python CalDAV sync service
│   └── recipe-scraper/          # Python recipe import service
├── web/                         # React frontend
├── desktop/                     # Electron app
├── config.example.yaml          # reference config
└── docker-compose.yml           # self-hosted dev environment
```

## Conventions

- Go: follow standard Go project layout. Exported types in model/, handlers return JSON, services contain business logic, handlers are thin.
- SQL: write in sql/queries/*.sql with sqlc annotations. Run `sqlc generate` after changes.
- Naming: snake_case in SQL/JSON, PascalCase in Go, camelCase in TypeScript.
- Errors: return structured JSON errors with code + message. Never expose internal details.
- Auth: JWT in Authorization header. PIN auth produces scoped JWT. household_id extracted from JWT by middleware, injected into context.
- Every table has household_id (except Account, AuditEntry, BackupRecord, IngredientCanonical).
- Frontend: shadcn/ui components, Tailwind utility classes, member colors via CSS custom properties.
- Commit messages: conventional commits (feat:, fix:, test:, docs:, chore:).

## Testing Patterns

```go
// Unit test (no I/O)
//go:build unit
func TestExpandRRULE(t *testing.T) { ... }

// Integration test (real Postgres via testcontainers)
//go:build integration
func TestEventsAPI(t *testing.T) {
    pool := testutil.SetupTestDB(t)
    testutil.WithTestTx(t, pool, func(tx pgx.Tx) { ... })
}
```

- Factories: `testutil.MakeHousehold()`, `testutil.MakeMember()`, `testutil.MakeEvent()` with functional options
- External APIs: VCR recordings (go-vcr for Go, vcrpy for Python)
- Time: inject clock interface, never call time.Now() directly

## What NOT to Do

- Don't add DynamoDB, SQLite, or any non-PostgreSQL storage
- Don't add Viper, Cobra, or any config library other than Kong
- Don't run tests in parallel
- Don't add AI proxy/billing — users bring their own keys
- Don't add telemetry, analytics, or tracking
- Don't hardcode secrets — use config.yaml + env var overrides
- Don't use an ORM — sqlc only, visible SQL queries
- Don't create Python code in the Go codebase — Python lives in services/

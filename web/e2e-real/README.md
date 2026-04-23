# Real-Stack E2E Tests (`e2e-real/`)

This directory contains Playwright end-to-end tests that run against the **actual Go backend**, Postgres, and Redis — not the fallback/demo mode used by `e2e/`.

---

## Prerequisites

| Requirement | Notes |
|---|---|
| Docker Desktop (or Docker Engine) | `docker compose` must work from the repo root |
| Go 1.21+ | For `go run ./cmd/server` |
| Node.js 18+ / npm | For Next.js dev server |
| `goose` CLI or `make migrate` | Migrations are run via `make migrate` |
| Ports 3000, 5432, 6379, 8080 free | Checked at startup |

---

## Running locally

### Option A — single command (recommended)

```bash
# From the repo root:
make e2e-real
```

This will:
1. `docker compose down -v` (fresh Postgres volumes)
2. `docker compose up -d postgres redis`
3. `make migrate`
4. Start the Go server on port 8080 with `TIDYBOARD_ALLOW_RESET=true`
5. Start Next.js dev server on port 3000 with `NEXT_PUBLIC_API_URL=http://localhost:8080`
6. Run Playwright tests
7. Stop the Go server and Docker services on exit (via `trap EXIT`)

### Option B — manual stack

If you already have the stack running:

```bash
# 1. Make sure the Go server has TIDYBOARD_ALLOW_RESET=true
TIDYBOARD_ALLOW_RESET=true go run ./cmd/server serve

# 2. From web/:
npm run e2e:real
```

### Interactive / debug mode

```bash
npm run e2e:real:ui
```

Opens the Playwright UI with time-travel debugging.

---

## Key environment variables

| Variable | Default | Purpose |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8080` | Go backend URL (Next.js + tests) |
| `NEXT_URL` | `http://localhost:3000` | Next.js dev server URL |
| `TIDYBOARD_ALLOW_RESET` | _(unset)_ | **Must be `true`** on the Go server to enable `POST /v1/admin/reset` |
| `TIDYBOARD_AUTH_JWT_SECRET` | `e2e-test-jwt-secret-change-me` | JWT secret (set in global-setup) |
| `TIDYBOARD_DB_PASSWORD` | `tidyboard_dev_password` | Postgres password |
| `CI` | _(unset)_ | When set, `reuseExistingServer` is disabled |

---

## Test architecture

```
e2e-real/
├── playwright.config.ts      # Own config: separate from web/playwright.config.ts
├── global-setup.ts           # Starts Docker + Go server, runs migrations
├── global-teardown.ts        # Stops Go server + Docker services
├── first-family.spec.ts      # Main test: full onboarding → dashboard flow
├── helpers/
│   ├── api.ts                # Direct Go API calls for setup/teardown/seeding
│   └── fixtures.ts           # Custom fixtures (skipIfNoDocker, resetDB, testAccount)
└── README.md                 # This file
```

### The `POST /v1/admin/reset` endpoint

`internal/handler/admin_reset.go` adds a reset endpoint that truncates all application tables. It is:

- Compiled into the **production binary** (no build tag needed)
- Gated by the `TIDYBOARD_ALLOW_RESET=true` environment variable — returns 403 otherwise
- Used by the `resetDB` fixture to guarantee a clean state between tests

### `data-testid` additions

The following `data-testid` attributes were added to UI components to make the E2E selectors more robust (the spec gracefully falls back to text/aria selectors if testids are missing):

| Attribute | Component | File |
|---|---|---|
| `data-testid="add-event-btn"` | Calendar page "+ Event" button | `web/src/app/calendar/page.tsx` (suggested, not yet added — the spec falls back to text match) |
| `data-testid="event-title-input"` | Event creation modal title input | (suggested, not yet added) |
| `data-testid="logout-btn"` | Settings / nav logout button | (suggested, not yet added) |

These testids are left as suggestions because adding them requires touching `web/src/` which this task avoids unless strictly necessary. The spec uses `text=` and `role=` selectors as primary targets.

---

## The "first family" test flow

| Step | What happens |
|---|---|
| 1 | Navigate to `/onboarding`; click through all 7 steps; land on `/` |
| 2 | Verify `GET /v1/auth/me` returns valid account/household/role |
| 3 | Create an event via the calendar UI (or API fallback); verify it appears |
| 4 | Seed 3 family members (1 adult + 2 children with PINs) + 1 shared list via API |
| 5 | Toggle a list item; verify the toggle broadcasts correctly (WebSocket) |
| 6 | Log in as a child via PIN; verify `role=child` in `/v1/auth/me` |
| 7 | Log out; verify landing on `/login` |

---

## CI guidance (do not add yet — document only)

These tests are **expensive** (require Postgres + Redis + Go + Next.js).  
Suggested CI strategy:

- **Run on**: PRs targeting `main`, and scheduled nightly runs
- **Skip on**: every push to feature branches (use the faster `e2e` fallback suite instead)
- **GitHub Actions example**:

```yaml
real-e2e:
  runs-on: ubuntu-latest
  if: github.event_name == 'pull_request' || github.event_name == 'schedule'
  services:
    postgres:
      image: postgres:16-alpine
      env:
        POSTGRES_DB: tidyboard
        POSTGRES_USER: tidyboard
        POSTGRES_PASSWORD: tidyboard_dev_password
      options: >-
        --health-cmd pg_isready
        --health-interval 5s
        --health-retries 10
    redis:
      image: redis:7-alpine
      options: >-
        --health-cmd "redis-cli ping"
        --health-interval 5s
        --health-retries 10
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-go@v5
      with: { go-version: '1.21' }
    - uses: actions/setup-node@v4
      with: { node-version: '20' }
    - run: npm ci
      working-directory: web
    - run: npx playwright install --with-deps chromium
      working-directory: web
    - name: Run migrations
      run: make migrate
      env:
        TIDYBOARD_DB_PASSWORD: tidyboard_dev_password
    - name: Start Go server
      run: |
        TIDYBOARD_ALLOW_RESET=true \
        TIDYBOARD_AUTH_JWT_SECRET=ci-test-secret \
        TIDYBOARD_DATABASE_PASSWORD=tidyboard_dev_password \
        go run ./cmd/server serve &
        echo $! > /tmp/go-server.pid
    - name: Run e2e-real tests
      run: npm run e2e:real
      working-directory: web
      env:
        CI: "1"
        NEXT_PUBLIC_API_URL: http://localhost:8080
        TIDYBOARD_ALLOW_RESET: "true"
    - uses: actions/upload-artifact@v4
      if: always()
      with:
        name: playwright-report
        path: web/test-results/e2e-real/
```

### Cost estimate

| Resource | Startup time | Per-test overhead |
|---|---|---|
| Postgres | ~5 s | ~20 ms/reset |
| Redis | ~2 s | negligible |
| Go server (`go run`) | ~15-30 s | negligible |
| Next.js dev server | ~20-40 s | negligible |

**Total cold-start overhead**: ~60-90 s before first test.  
**Expected flakiness**: Low (~2-5%) from timing issues in WebSocket broadcast assertion and onboarding step clicks. Use `--retries=1` in CI.

---

## Troubleshooting

**Tests skipped with "Docker is not available"**  
Install Docker Desktop and ensure the daemon is running (`docker info`).

**`make migrate` fails**  
Ensure Postgres is healthy: `docker compose ps postgres`. Check logs: `docker compose logs postgres`.

**Go server fails to start**  
Check `/tmp/tidyboard-e2e-server.log` for errors. Common causes: port 8080 already in use, missing `go` in PATH.

**"reset endpoint is disabled" error**  
The Go server was started without `TIDYBOARD_ALLOW_RESET=true`. Use `make e2e-real` which sets this automatically.

**Onboarding test fails at step X**  
The onboarding wizard uses static demo values in the UI components. The spec uses the dev-nav "Next" button which calls `advance()` in the page. If the Next.js dev server is not pointed at the real backend (`NEXT_PUBLIC_API_URL`), the wizard will run in fallback mode and steps 1-3 will not make real API calls.

Verify: `curl http://localhost:8080/health` and `echo $NEXT_PUBLIC_API_URL`.

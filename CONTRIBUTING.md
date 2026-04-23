# Contributing to Tidyboard

## Getting started

### Clone and run locally

```bash
git clone https://github.com/<your-org>/tidyboard.git
cd tidyboard
make up          # starts Postgres, Redis, Go server, and Python services via Docker Compose
```

The frontend dev server runs separately:

```bash
cd web
npm ci
npm run dev      # http://localhost:3000
```

## Branch and PR workflow

1. Branch off `main`: `git checkout -b feat/your-feature`
2. Make changes, keeping commits focused and atomic.
3. Open a pull request against `main`.
4. All CI checks must pass before merging.
5. Squash-merge preferred for feature branches; merge commits for release branches.

## Running tests

### Frontend (Next.js / Vitest)

```bash
cd web
npm test              # run once
npm test:watch        # watch mode
npm run coverage      # with coverage report
```

### Backend (Go)

```bash
# Unit tests only (no database required)
go test -tags=unit -p 1 -count=1 -race ./...

# Integration tests (requires Postgres — see .env.example)
export TIDYBOARD_TEST_DSN="postgres://tidyboard:tidyboard_dev_password@localhost:5432/tidyboard?sslmode=disable"
go test -tags=integration -p 1 -count=1 -race ./...
```

### Python services

```bash
cd services/sync-worker        # or recipe-scraper
pip install -r requirements.txt
python -m pytest tests/ -m "not integration" -x -v
```

## Code style

| Layer | Tool | Command |
|---|---|---|
| Go | `go vet` + `gofmt` | `go vet ./...` / `gofmt -w .` |
| Python | `ruff` | `ruff check services/` |
| TypeScript | `tsc --strict` | `npm run build` (type-checks) |

CI enforces all of the above automatically.

## License

Tidyboard is released under the [AGPL-3.0](LICENSE) license.

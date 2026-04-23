# Tidyboard Load Testing

This directory contains k6 load test scripts for the Tidyboard Go backend.

## Prerequisites

Install k6 (macOS):

```bash
brew install k6
```

Other platforms: https://k6.io/docs/getting-started/installation/

The backend must be running before executing any test. Start it with:

```bash
make up        # starts Postgres + the Go server via docker compose
make migrate   # run migrations (first time only)
```

---

## Running tests

All scripts read `BASE_URL` from the environment (default: `http://localhost:8080`).

| Make target | Script | Scenario |
|---|---|---|
| `make loadtest-smoke` | `smoke.js` | 1 VU, 30 s — sanity check |
| `make loadtest-load` | `load.js` | 0→50 VU ramp, 5 m steady, ramp down |
| `make loadtest-stress` | `stress.js` | 0→500 VU — find the breaking point |
| `make loadtest-soak` | `soak.js` | 20 VU for 2 h — leak detection |
| `make loadtest-spike` | `spike.js` | 10→200→10 VU abrupt spike |
| `make loadtest-auth` | `auth.js` | Hammers /v1/auth/* — bcrypt bottleneck |
| `make loadtest-events` | `events.js` | Full CRUD + range queries on /v1/events |
| `make loadtest-baseline` | smoke + load | Saves JSON report to `loadtest/reports/` |

Example:

```bash
# Quick sanity check against local server
make loadtest-smoke

# Override URL (e.g. staging)
BASE_URL=https://api.staging.example.com make loadtest-load

# Run directly with k6
k6 run loadtest/smoke.js -e BASE_URL=http://localhost:8080
```

---

## Test scenario matrix

| Script | VUs | Duration | p95 target | Error rate target | Purpose |
|---|---|---|---|---|---|
| smoke | 1 | 30 s | < 500 ms | < 1 % | Verify all endpoints respond |
| load | 0→50 | ~8 m | < 500 ms | < 1 % | Baseline performance |
| stress | 0→500 | ~8 m | < 2 000 ms | < 10 % | Find saturation point |
| soak | 20 | 2 h | < 600 ms | < 1 % | Memory/connection leak detection |
| spike | 10→200→10 | ~6 m | < 1 500 ms | < 5 % | Elasticity under sudden load |
| auth | 0→20 | ~4.5 m | login < 2 000 ms | < 1 % | bcrypt + JWT throughput |
| events | 0→30 | ~4.5 m | < 500 ms | < 1 % | CRUD + range query performance |

---

## Authentication

Each script registers a unique test account during `setup()` (runs once before VUs start) and uses the returned JWT for all subsequent requests. Credentials are not stored — the account is ephemeral and keyed by timestamp + VU suffix.

The `BASE_URL` and optional `SEED` (for deterministic data generation) are the only env vars used. No real credentials appear in any script.

---

## Interpreting output

k6 prints a summary after each run. Key metrics:

```
http_req_duration ............. avg=142ms  p(90)=280ms  p(95)=340ms  p(99)=610ms
http_req_failed ............... 0.12%
http_reqs ..................... 15 234  (42.3/s)
vus_max ....................... 50
```

- **`http_req_duration`** — time from request sent to response received. `p(95)` is the threshold checked against the configured limit.
- **`http_req_failed`** — fraction of requests with a non-2xx response or network error. Must stay below 1 % for smoke/load/soak.
- **`http_reqs`** — total requests and throughput (req/s).
- **`vus_max`** — peak virtual user count reached.

Requests are tagged by `endpoint` (e.g. `{endpoint:events_list}`) so you can filter the summary per-endpoint using `--out json` and `jq`.

### Filtering per-endpoint

```bash
k6 run loadtest/events.js --out json=out.json -e BASE_URL=http://localhost:8080
cat out.json | jq 'select(.metric=="http_req_duration" and .data.tags.endpoint=="events_create") | .data.value' | sort -n | tail -5
```

---

## Saved baseline reports

```bash
make loadtest-baseline
```

This runs smoke + load and saves JSON output to:

```
loadtest/reports/baseline-<timestamp>.json
```

Compare two runs to detect regressions:

```bash
# Extract p95 from both files
jq 'select(.metric=="http_req_duration") | .data.value' loadtest/reports/baseline-A.json | sort -n | awk 'BEGIN{c=0} {a[c++]=$1} END{print a[int(c*0.95)]}'
```

---

## CI integration

The load tests are **not** run in CI by default — they require a live server and take minutes to hours. To add them to GitHub Actions:

```yaml
# .github/workflows/load.yml (example — do not add without capacity planning)
name: Load Tests
on:
  workflow_dispatch:          # manual trigger only
    inputs:
      scenario:
        description: "Script to run (smoke|load|stress)"
        default: smoke
jobs:
  load:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_DB: tidyboard
          POSTGRES_USER: tidyboard
          POSTGRES_PASSWORD: tidyboard_dev_password
        ports: ["5432:5432"]
    steps:
      - uses: actions/checkout@v4
      - name: Install k6
        run: |
          sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg \
            --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
          echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" \
            | sudo tee /etc/apt/sources.list.d/k6.list
          sudo apt-get update && sudo apt-get install k6
      - name: Start server
        run: go run ./cmd/server &
        env:
          TIDYBOARD_DB_DSN: "host=localhost port=5432 dbname=tidyboard user=tidyboard password=tidyboard_dev_password sslmode=disable"
          TIDYBOARD_JWT_SECRET: ci-test-secret
      - name: Wait for health
        run: until curl -sf http://localhost:8080/health; do sleep 1; done
      - name: Run load test
        run: k6 run loadtest/${{ github.event.inputs.scenario }}.js -e BASE_URL=http://localhost:8080
```

Recommended: run only `smoke` in CI on each push (< 1 min), run `load` on release branches, and run `stress`/`soak` manually via `workflow_dispatch`.

---

## Chaos testing (Go)

Alongside these k6 scripts, the repo includes a Go chaos testing utility at:

- `internal/testutil/chaos.go` — `ChaosMiddleware` wraps any `http.Handler` with latency injection, synthetic HTTP failures, and connection drops. Build-tagged `unit || integration` so it never compiles into production binaries.
- `internal/broadcast/chaos.go` — `ChaosBroadcaster` wraps the real `Broadcaster` with publish delays and drop rates for testing WebSocket reconnect paths.

See `internal/testutil/chaos_test.go` and `internal/broadcast/chaos_test.go` for usage examples.

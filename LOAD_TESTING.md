# Load Testing & Chaos Engineering — Tidyboard

This document summarises the load testing strategy for the Tidyboard Go backend,
covering the k6 script suite, the Go chaos utilities, and guidance for interpreting
results and integrating into CI.

---

## Strategy overview

| Layer | Tool | Location |
|---|---|---|
| External load tests | k6 | `loadtest/` |
| HTTP chaos middleware | Go (test-only) | `internal/testutil/chaos.go` |
| Broadcaster chaos | Go (test-only) | `internal/broadcast/chaos.go` |

The two layers complement each other:

- **k6** tests the system end-to-end at realistic and extreme traffic levels, identifying throughput limits, latency regressions, and resource leaks.
- **Go chaos utilities** inject failures inside unit/integration tests to verify graceful degradation paths (rate limiting, WS reconnect, error propagation) without needing a live load generator.

---

## k6 scripts

All scripts live in `loadtest/`. Each one:

- Reads `BASE_URL` from the environment (default `http://localhost:8080`)
- Registers a unique test account in `setup()` and uses the JWT for all VU iterations
- Asserts 2xx on every response via `check()`
- Applies global thresholds: `http_req_duration p(95) < 500 ms`, `http_req_failed rate < 1 %`
- Tags every request with `{endpoint:<name>}` for per-endpoint filtering

### Script matrix

| Script | Stage profile | Peak VUs | Duration | Purpose |
|---|---|---|---|---|
| `smoke.js` | Flat | 1 | 30 s | Sanity — every endpoint returns 2xx |
| `load.js` | Ramp → steady → ramp down | 50 | ~8 m | Baseline throughput and p95 latency |
| `stress.js` | Progressive ramp | 500 | ~8 m | Find saturation / breaking point |
| `soak.js` | Flat | 20 | 2 h | Memory leaks, goroutine/connection leaks |
| `spike.js` | Low → spike → low | 200 (peak) | ~6 m | Elasticity under abrupt load change |
| `auth.js` | Ramp → steady | 20 | ~4.5 m | bcrypt/JWT throughput, rate-limiter behaviour |
| `events.js` | Ramp → steady | 30 | ~4.5 m | CRUD + range-query performance on /v1/events |

### Running locally

```bash
brew install k6      # one-time
make up              # start Postgres + server
make loadtest-smoke  # quick check (30 s)
make loadtest-load   # baseline (~8 m)
make loadtest-baseline  # smoke + load → saves JSON report to loadtest/reports/
```

Override the target URL:

```bash
BASE_URL=https://api.staging.example.com make loadtest-load
```

---

## Target numbers (baseline goals)

These are initial targets based on a single-instance deployment with Postgres.
Adjust after running the first baseline.

| Metric | Target |
|---|---|
| Throughput (load test, 50 VU) | ≥ 200 req/s |
| p95 latency (list endpoints) | < 400 ms |
| p95 latency (auth/login, bcrypt) | < 2 000 ms |
| Error rate (load test) | < 1 % |
| Error rate (stress test peak) | < 10 % |
| Soak test memory growth (2 h) | < 20 MB RSS increase |

---

## Chaos testing (Go)

### ChaosMiddleware (`internal/testutil/chaos.go`)

Wraps any `http.Handler` with configurable failure injection. Build-tagged
`unit || integration` — never compiled into production binaries.

```go
mw := testutil.ChaosMiddleware(testutil.ChaosConfig{
    LatencyMean:   50 * time.Millisecond,
    LatencyJitter: 20 * time.Millisecond,
    FailureRate:   0.1,   // 10% → 503
    DropConnection: 0.02, // 2% connection drops
    Seed:          42,    // deterministic
})(realHandler)
```

The `Seed` field ensures tests are non-flaky: the same seed always produces the
same failure pattern, making assertions on failure counts reliable.

**Failure evaluation order per request:**
1. DropConnection — hijack TCP and close; falls back to 502 if hijacking unavailable
2. FailureRate — write synthetic error status (default 503)
3. LatencyMean + LatencyJitter — sleep before forwarding
4. Forward to next handler

### ChaosBroadcaster (`internal/broadcast/chaos.go`)

Wraps the real `Broadcaster` with publish delays and drop rates to test WebSocket
reconnect/retry paths.

```go
inner := broadcast.NewMemoryBroadcaster()
chaos := broadcast.NewChaosBroadcaster(inner, broadcast.ChaosBroadcastConfig{
    PublishDelay: 20 * time.Millisecond,
    DropRate:     0.15, // 15% of publishes silently dropped
    Seed:         42,
})
```

Use `ChaosBroadcaster` in integration tests that exercise the WS handler to verify
that clients tolerate message loss and reconnect gracefully.

### Running chaos unit tests

```bash
go test -tags=unit -v ./internal/testutil/... ./internal/broadcast/...
```

---

## CI integration

Load tests are **not** run in CI by default. The recommended CI strategy:

| Trigger | Script | Rationale |
|---|---|---|
| Every push / PR | None | Too slow for per-commit feedback |
| Release branch merge | `smoke` + `load` | Catch regressions before deploy |
| Manual `workflow_dispatch` | Any | On-demand stress / soak runs |
| Nightly cron | `soak` | Catch slow memory leaks |

See `loadtest/README.md` for a sample GitHub Actions workflow.

Chaos unit tests (`-tags=unit`) **are** run in CI as part of `make test`.

---

## Interpreting results

After a k6 run, inspect:

1. **`http_req_failed` rate** — if > threshold, check server logs for 5xx causes.
2. **`http_req_duration` p95/p99** — compare against baseline JSON in `loadtest/reports/`.
3. **`dropped_iterations`** — if high during stress/spike, the server is queue-limited; investigate connection pool size (`pgxpool.MaxConns`) and rate limiter config.
4. **RSS growth during soak** — `docker stats` or Prometheus `process_resident_memory_bytes`; a steady upward trend indicates a goroutine or connection leak.

---

## Files added

```
loadtest/
├── README.md
├── smoke.js
├── load.js
├── stress.js
├── soak.js
├── spike.js
├── auth.js
├── events.js
├── reports/          (gitignored — generated output)
└── helpers/
    ├── config.js
    └── data.js

internal/testutil/chaos.go
internal/testutil/chaos_test.go
internal/broadcast/chaos.go
internal/broadcast/chaos_test.go
LOAD_TESTING.md
```

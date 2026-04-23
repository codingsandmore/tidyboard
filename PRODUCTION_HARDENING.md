# Production Hardening

Summary of production-grade protections in the Tidyboard Go backend (Wave H).

## Request-path middleware

| Middleware | Purpose | Config |
|---|---|---|
| `RequestID` | correlates logs per request | always on |
| `InjectRequestMeta` | `remote_addr`, `user_agent` into ctx for audit | always on |
| `StructuredLogger` (slog JSON) | request/response lines, redacts `/v1/auth/*` bodies | `cfg.Log.Level` |
| `Recovery` | panic → 500 JSON | always on |
| `CORS` | whitelist from `cfg.Server.CORSOrigins` + preflight cache `max-age=3600`, `credentials=true` only on whitelisted origin | `cfg.Server.CORSOrigins` |
| `Compress(5)` | gzip JSON > 1 KB when `Accept-Encoding: gzip` | always on |
| `MaxRequestBody` | `http.MaxBytesReader` with 413 on overflow | `cfg.Server.MaxRequestBodyBytes` (default 1 MB; 10 MB on `/v1/media/upload`) |
| `RateLimitPerIP` | token bucket per `X-Forwarded-For` chain tail | unauthenticated routes only |
| `Auth` (JWT) | extracts account_id / household_id / member_id / role | required on `/v1/*` except auth/webhook/callback/metrics/health |
| `RateLimitPerAccount` | Redis token bucket per account | `cfg.Auth.RateLimitPerMin` (default 60) |
| `Metrics` | records `tidyboard_http_requests_total` + `..._duration_seconds` | `cfg.Server.MetricsEnabled` |

## Health + readiness

- `GET /health` — liveness (always 200 if process up)
- `GET /ready` — deep check: DB ping (1s), Redis ping (500ms), optional sync-worker/recipe-scraper pings. Returns `200 {"status":"ok","checks":{...}}` or `503 {"status":"degraded","failures":[...]}`

## Metrics

`GET /metrics` (Prometheus format), guardable via `cfg.Server.MetricsEnabled` and `cfg.Server.MetricsAllowedIPs`.

Exposed:
- `tidyboard_http_requests_total{method,path,status}`
- `tidyboard_http_request_duration_seconds{method,path}` histogram
- `tidyboard_db_pool_connections{state}` gauge (idle / in_use / total)
- `tidyboard_websocket_clients` gauge
- `tidyboard_background_jobs_duration_seconds{job}` histogram
- `tidyboard_audit_entries_written_total` counter

Scrape from Prometheus with:
```yaml
scrape_configs:
  - job_name: tidyboard
    static_configs:
      - targets: ["tidyboard:8080"]
```

## Graceful shutdown

Signal → drain order (10s timeout via `cfg.Server.ShutdownTimeout`):
1. Stop accepting new HTTP connections
2. Broadcast `Going Away` (1001) to WebSocket clients, wait up to 10s for acks
3. Stop cron (`BackupService.Stop()`)
4. `http.Server.Shutdown(ctx)` — drains inflight requests
5. `pgxpool.Pool.Close()` — drains DB connections
6. `redis.Client.Close()`

Each step logged with timing.

## Secrets

- JWT: `TIDYBOARD_AUTH_JWT_SECRET` — required in production, 32+ bytes
- Stripe: `TIDYBOARD_STRIPE_*` — optional, only when billing enabled
- Google OAuth: `TIDYBOARD_AUTH_OAUTH_GOOGLE_*` — optional
- DB password: `TIDYBOARD_DATABASE_PASSWORD` (YAML fallback only for dev)
- AWS credentials: NEVER env vars — always named profiles (see `user_aws_profiles.md`)

## Per-environment config

| Config | Dev | Staging | Prod |
|---|---|---|---|
| `Server.CORSOrigins` | `http://localhost:3000` | staging domain | prod domain only |
| `Server.MetricsEnabled` | true | true | true (IP-allowlisted) |
| `Auth.JWTExpiry` | 15m | 15m | 15m |
| `Auth.RateLimitPerMin` | 120 | 60 | 60 |
| `Database.SSLMode` | disable | verify-full | verify-full |
| `Storage.Type` | local | s3 | s3 |
| `Backup.S3Enabled` | false | true | true |
| `AI.Enabled` | true | true | true (BYOK, client-only) |

## What's NOT yet production-grade

- No Sentry / error tracker integration — `TODO` to wire
- No structured audit for read actions (only mutations)
- No query-level slow log
- No explicit DB connection pool metrics beyond idle/in_use gauges
- No request ID propagation to Python services (add `X-Request-Id` header forwarding in the Go clients)
- No admin-UI key rotation tool

These are deferrable — the current stack is shippable behind a reverse proxy with TLS termination.

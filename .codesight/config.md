# Config

## Environment Variables

- `CI` **required** — web/e2e-real/playwright.config.ts
- `E2E_ADMIN_TOKEN` **required** — web/e2e-real/first-family.spec.ts
- `E2E_CHILD1_ID` **required** — web/e2e-real/first-family.spec.ts
- `E2E_HH_ID` **required** — web/e2e-real/first-family.spec.ts
- `E2E_LIST_ID` **required** — web/e2e-real/first-family.spec.ts
- `E2E_REAL_DOCKER_STARTED` **required** — web/e2e-real/global-setup.ts
- `E2E_REAL_SKIP` **required** — web/e2e-real/global-setup.ts
- `NEXT_PUBLIC_API_URL` (has default) — .env.example
- `NEXT_PUBLIC_STRIPE_ENABLED` **required** — web/src/app/settings/page.tsx
- `NEXT_URL` **required** — web/e2e-real/playwright.config.ts
- `NODE_ENV` **required** — web/src/components/sw-register.tsx
- `RECIPE_SCRAPER_PORT` (has default) — .env.example
- `SYNC_WORKER_PORT` (has default) — .env.example
- `TIDYBOARD_ALLOW_RESET` **required** — internal/handler/admin_reset.go
- `TIDYBOARD_AUTH_JWT_SECRET` **required** — .env.example
- `TIDYBOARD_AUTH_OAUTH_GOOGLE_CLIENT_ID` **required** — .env.example
- `TIDYBOARD_AUTH_OAUTH_GOOGLE_CLIENT_SECRET` **required** — .env.example
- `TIDYBOARD_DATABASE_HOST` (has default) — .env.example
- `TIDYBOARD_DATABASE_NAME` (has default) — .env.example
- `TIDYBOARD_DATABASE_PASSWORD` (has default) — .env.example
- `TIDYBOARD_DATABASE_PORT` (has default) — .env.example
- `TIDYBOARD_DATABASE_USER` (has default) — .env.example
- `TIDYBOARD_DB_PASSWORD` (has default) — .env.example
- `TIDYBOARD_LOG_FORMAT` (has default) — .env.example
- `TIDYBOARD_LOG_LEVEL` (has default) — .env.example
- `TIDYBOARD_NOTIFY_SMTP_PASSWORD` **required** — .env.example
- `TIDYBOARD_NOTIFY_SMTP_USER` **required** — .env.example
- `TIDYBOARD_REDIS_HOST` (has default) — .env.example
- `TIDYBOARD_REDIS_PASSWORD` **required** — .env.example
- `TIDYBOARD_REDIS_PORT` (has default) — .env.example
- `TIDYBOARD_SCRAPER_LOG_LEVEL` (has default) — services/recipe-scraper/.env.example
- `TIDYBOARD_SCRAPER_MAX_HTML_BYTES` (has default) — services/recipe-scraper/.env.example
- `TIDYBOARD_SCRAPER_PORT` (has default) — services/recipe-scraper/.env.example
- `TIDYBOARD_SCRAPER_TIMEOUT_SECONDS` (has default) — services/recipe-scraper/.env.example
- `TIDYBOARD_SERVER_CORS_ORIGINS` (has default) — .env.example
- `TIDYBOARD_SERVER_HOST` (has default) — .env.example
- `TIDYBOARD_SERVER_PORT` (has default) — .env.example
- `TIDYBOARD_STORAGE_LOCAL_PATH` (has default) — .env.example
- `TIDYBOARD_STORAGE_PUBLIC_BASE_URL` (has default) — .env.example
- `TIDYBOARD_STORAGE_TYPE` (has default) — .env.example
- `TIDYBOARD_SYNC_LOG_LEVEL` (has default) — services/sync-worker/.env.example
- `TIDYBOARD_SYNC_PORT` (has default) — services/sync-worker/.env.example
- `TIDYBOARD_SYNC_TIMEOUT_SECONDS` (has default) — services/sync-worker/.env.example
- `TIDYBOARD_TEST_DSN` **required** — internal/handler/health_test.go

## Config Files

- `.env.example`
- `Dockerfile`
- `docker-compose.yml`
- `go.mod`
- `services/recipe-scraper/.env.example`
- `services/sync-worker/.env.example`
- `web/next.config.ts`

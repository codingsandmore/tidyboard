# Backend Status

Last updated: 2026-04-22

## Works end-to-end (no DB required)

| Endpoint | Status | Notes |
|---|---|---|
| `GET /health` | ✅ Working | Returns `{"status":"ok","version":"...","timestamp":"..."}` |
| `GET /ready` | ✅ Working | Pings DB pool; returns 200 when Postgres is up |
| `go build ./...` | ✅ Passing | Clean build, zero errors |
| `go test -tags=unit ./...` | ✅ Passing | Unit tests: bcrypt, PIN, broadcaster round-trip, broadcast cancel, retention sweep |
| `go run ./cmd/server --help` | ✅ Passing | Full Kong CLI help with all flags and env vars |
| JWT middleware | ✅ Working | Validates HS256 tokens, injects account/household/member IDs into ctx |
| CORS middleware | ✅ Working | Per-origin header injection, preflight handling |
| Logger middleware | ✅ Working | Structured JSON via `log/slog` |
| Recovery middleware | ✅ Working | Panic recovery → 500 JSON |
| Rate limiter middleware | ✅ Working | In-memory token bucket per IP |
| InjectRequestMeta middleware | ✅ Working | Injects RemoteAddr + User-Agent into context for audit |

## Working with Postgres

All authenticated endpoints are now fully implemented against Postgres via sqlc-generated code.

| Domain | Endpoints | Status |
|---|---|---|
| Auth | `POST /v1/auth/register` | ✅ Working |
| Auth | `POST /v1/auth/login` | ✅ Working |
| Auth | `POST /v1/auth/pin` | ✅ Working |
| Auth | `GET /v1/auth/me` | ✅ Working |
| Households | `POST /v1/households` | ✅ Working |
| Households | `GET /v1/households/:id` | ✅ Working |
| Households | `PATCH /v1/households/:id` | ✅ Working |
| Households | `DELETE /v1/households/:id` | ✅ Working |
| Members | `GET /v1/households/:id/members` | ✅ Working |
| Members | `POST /v1/households/:id/members` | ✅ Working |
| Members | `GET /v1/households/:id/members/:memberID` | ✅ Working |
| Members | `PATCH /v1/households/:id/members/:memberID` | ✅ Working |
| Members | `DELETE /v1/households/:id/members/:memberID` | ✅ Working |
| Events | `GET /v1/events` (with optional `?start=&end=` range filter) | ✅ Working — publishes `event.created/updated/deleted` to broadcaster |
| Events | `POST /v1/events` | ✅ Working |
| Events | `GET /v1/events/:id` | ✅ Working |
| Events | `PATCH /v1/events/:id` | ✅ Working |
| Events | `DELETE /v1/events/:id` | ✅ Working |
| Lists | `GET /v1/lists` | ✅ Working — publishes `list.*` events to broadcaster |
| Lists | `POST /v1/lists` | ✅ Working |
| Lists | `GET /v1/lists/:id` | ✅ Working |
| Lists | `PATCH /v1/lists/:id` | ✅ Working |
| Lists | `DELETE /v1/lists/:id` | ✅ Working |
| List Items | `GET /v1/lists/:id/items` | ✅ Working |
| List Items | `POST /v1/lists/:id/items` | ✅ Working |
| List Items | `PATCH /v1/lists/:id/items/:itemID` | ✅ Working |
| List Items | `DELETE /v1/lists/:id/items/:itemID` | ✅ Working |
| Recipes | `GET /v1/recipes` | ✅ Working |
| Recipes | `POST /v1/recipes` | ✅ Working |
| Recipes | `GET /v1/recipes/:id` | ✅ Working |
| Recipes | `PATCH /v1/recipes/:id` | ✅ Working |
| Recipes | `DELETE /v1/recipes/:id` | ✅ Working |
| Recipes | `POST /v1/recipes/import` | ✅ Working |
| Calendars | `GET /v1/calendars` | ✅ Working |
| Calendars | `POST /v1/calendars/ical` | ✅ Working — creates iCal calendar row (source='ical_url') |
| Calendars | `POST /v1/calendars/:id/sync` | ✅ Working |
| Calendars | `POST /v1/calendars/:id/sync-ical` | ✅ Working — proxies to sync-worker /sync/ical |
| **WebSocket** | **`GET /v1/ws`** | ✅ Working — JWT via `Authorization` header or `?token=`; streams household events |
| **Audit** | **`GET /v1/audit?limit=&offset=`** | ✅ Working — admin role required; returns paged household audit entries |
| **Admin** | **`POST /v1/admin/backup/run`** | ✅ Working — admin role required; triggers immediate backup in background |

## Real-time WebSocket (Task 1)

- **Package**: `internal/broadcast/`
- **`Broadcaster` interface**: `Publish(ctx, channel, event)` + `Subscribe(ctx, channel) (<-chan Event, cancel)`
- **`RedisBroadcaster`**: wraps `github.com/redis/go-redis/v9`; falls back to `MemoryBroadcaster` if Redis is unreachable at startup
- **`MemoryBroadcaster`**: in-process fan-out for tests and single-instance deploys
- **`Event` struct**: `{Type, HouseholdID, Payload json.RawMessage, Timestamp}`
- **`GET /v1/ws`**: upgrades via `github.com/coder/websocket`; authenticates via Bearer header or `?token=`; streams JSON frames; 30s ping keepalive
- **Mutations that publish** (non-blocking goroutine after DB write):
  - `EventService`: `event.created`, `event.updated`, `event.deleted`
  - `ListService`: `list.created`, `list.updated`, `list.deleted`, `list.item.created`, `list.item.updated`, `list.item.deleted`

## Audit Log (Task 2)

- **Schema**: `audit_entries` table in `migrations/20260423000007_init_audit.sql` (already existed)
  - `id`, `timestamp`, `household_id`, `actor_member_id`, `actor_account_id`, `action`, `entity_type`, `entity_id`, `details jsonb`, `device_info`, `ip_address`
  - Indexes on `(household_id, timestamp DESC)`, `(entity_type, entity_id)`, `(actor_account_id)`
- **SQL queries**: `sql/queries/audit.sql` → `InsertAuditEntry`, `ListHouseholdAudit`, `ListAccountAudit`
- **`AuditService.Log()`**: fire-and-forget goroutine; serialises diff to JSONB; reads account/household/member ID, remote addr, user-agent from context; logs errors via `slog` without blocking
- **Wired into**: all `EventService` and `ListService` mutations
- **Middleware**: `InjectRequestMeta()` injects `RemoteAddr` + `User-Agent` into context (global middleware stack)

## Backup Job (Task 3)

- **Package**: `internal/service/backup.go`
- **Scheduler**: `github.com/robfig/cron/v3`; schedule from `config.Backup.Schedule` (default `0 3 * * *`)
- **On tick**: runs `pg_dump` → gzip → `LocalPath/tidyboard-YYYY-MM-DD-HHMMSS.sql.gz`; computes SHA-256; enforces retention (deletes files older than `Retention` days); S3 upload stubbed (`log "TODO S3 upload"`)
- **DB record**: `backup_records` table (in same migration); status transitions `in_progress` → `completed`/`failed`
- **Wired in `main.go`**: started after server start if `cfg.Backup.Enabled`; stopped gracefully in signal handler
- **`POST /v1/admin/backup/run`**: admin-only; triggers immediate `manual` backup in a goroutine; returns 202

## sqlc-generated query layer

`internal/query/` regenerated with `sqlc v1.31.1` after adding new SQL files.

| File | Queries |
|---|---|
| `account.sql.go` | `CreateAccount`, `GetAccountByID`, `GetAccountByEmail`, `UpdateAccount`, `DeactivateAccount` |
| `household.sql.go` | `CreateHousehold`, `GetHousehold`, `ListHouseholdsByAccount`, `UpdateHousehold`, `DeleteHousehold`, `RegenerateInviteCode`, `GetHouseholdByInviteCode` |
| `member.sql.go` | `CreateMember`, `GetMember`, `ListMembers`, `UpdateMember`, `DeleteMember`, `GetMemberByAccountAndHousehold` |
| `event.sql.go` | `CreateEvent`, `GetEvent`, `ListEventsInRange`, `UpdateEvent`, `DeleteEvent`, `GetEventByExternalID`, `UpsertEventByExternalID`, `GetCalendar` |
| `list.sql.go` | `CreateList`, `GetList`, `ListLists`, `UpdateList`, `DeleteList`, `CreateListItem`, `GetListItem`, `ListItems`, `UpdateListItem`, `DeleteListItem`, `CompleteAllItems` |
| `recipe.sql.go` | `CreateRecipe`, `GetRecipe`, `ListRecipes`, `SearchRecipes`, `UpdateRecipe`, `DeleteRecipe`, `IncrementTimesCooked`, `GetRecipeBySourceURL`, `ListFavoriteRecipes` |
| `audit.sql.go` | `InsertAuditEntry`, `ListHouseholdAudit`, `ListAccountAudit` |
| `backup.sql.go` | `InsertBackupRecord`, `UpdateBackupRecord`, `ListBackupRecords` |

## Integration tests

Gated on `TIDYBOARD_TEST_DSN` env var. Run with:

```bash
TIDYBOARD_TEST_DSN="host=localhost port=5432 dbname=tidyboard user=tidyboard password=tidyboard_dev_password sslmode=disable" \
  go test -tags=integration ./... -p 1 -count=1 -race
```

| Test file | Coverage |
|---|---|
| `internal/handler/auth_test.go` | Register + login round-trip, duplicate email → 409, wrong password → 401, PIN login → 401 |
| `internal/handler/household_test.go` | Create + get + update + delete; not-found → 404 |
| `internal/handler/event_test.go` | Create + list (no filter + range filter) + get + update + delete; out-of-range returns empty |
| `internal/handler/health_test.go` | GET /health → 200, GET /ready → 200 |
| `internal/handler/recipe_import_test.go` | Import success → 201, scraper 500 → 502, missing URL → 400, no auth → 401 |

## Migrations

8 goose migrations. Run with:

```bash
goose -dir migrations postgres "$DSN" up
```

| File | Tables |
|---|---|
| `20260423000001_init_accounts.sql` | `accounts` |
| `20260423000002_init_households.sql` | `households`, `invitations`, `join_requests` |
| `20260423000003_init_members.sql` | `members` |
| `20260423000004_init_events.sql` | `calendars`, `events` |
| `20260423000005_init_lists.sql` | `lists`, `list_items` |
| `20260423000006_init_recipes.sql` | `recipes`, `recipe_ingredients`, `recipe_steps`, `ingredient_canonical` |
| `20260423000007_init_audit.sql` | `audit_entries`, `backup_records` |
| `20260423000008_init_calendars_caldav.sql` | ALTER TABLE `calendars` adds `url`, `username`, `password_encrypted`, `display_name` |

## Stripe Billing (Task 4)

- **Config**: `StripeConfig` struct in `internal/config/config.go`; env vars `TIDYBOARD_STRIPE_SECRET_KEY`, `TIDYBOARD_STRIPE_PUBLISHABLE_KEY`, `TIDYBOARD_STRIPE_WEBHOOK_SECRET`
- **Migration**: `migrations/20260423000011_subscriptions.sql` — `subscriptions` table
- **SQL queries**: `sql/queries/subscription.sql` → `UpsertSubscription`, `GetSubscriptionByHousehold`, `GetSubscriptionByCustomer`, `UpdateSubscriptionStatus`
- **Service**: `internal/service/billing.go` — `BillingService`
- **Handler**: `internal/handler/billing.go`

| Endpoint | Auth | Notes |
|---|---|---|
| `POST /v1/billing/checkout` | JWT required | Creates Stripe Checkout session; returns `{"url":"..."}` |
| `POST /v1/billing/portal` | JWT required | Creates Stripe Customer Portal session; returns `{"url":"..."}` |
| `GET /v1/billing/subscription` | JWT required | Returns current subscription row or `{"subscription":null}` |
| `POST /v1/billing/webhook` | None (Stripe signature) | Verifies `Stripe-Signature` header; handles `customer.subscription.*`, `invoice.payment_*` |

## Google OAuth (Task 5)

- **Config**: extends existing `OAuthConfig` — uses `GoogleClientID`, `GoogleClientSecret`
- **Migration**: `migrations/20260423000012_oauth_tokens.sql` — `oauth_tokens` table
- **SQL queries**: `sql/queries/oauth.sql` → `UpsertOAuthToken`, `GetOAuthToken`, `DeleteOAuthToken`
- **Service**: `internal/service/oauth.go` — `OAuthService`; state managed in-memory with 10-minute TTL
- **Handler**: `internal/handler/oauth.go`

| Endpoint | Auth | Notes |
|---|---|---|
| `POST /v1/auth/oauth/google/start` | JWT required | Returns `{"redirect_url":"..."}` for full-window redirect to Google |
| `GET /v1/auth/oauth/google/callback` | None (Google callback) | Exchanges code; redirects to `/onboarding?step=5&connected=1` or `/settings?connected=google` |

## iCal URL Calendar Integration (Task 6)

- **No new migration needed** — `calendars.source` already has `'ical_url'` in its CHECK constraint (migration `20260423000004_init_events.sql`)
- **New query methods** (hand-written to match sqlc pattern): `CreateCalendar`, `ListCalendars` in `internal/query/event.sql.go`
- **New client method**: `SyncClient.SyncICal()` in `internal/client/sync_client.go` — POSTs to `/sync/ical` on the sync-worker
- **New service method**: `SyncService.SyncICalURL()` in `internal/service/sync.go` — same upsert logic as `SyncCalendar`
- **New handler**: `internal/handler/calendar.go` — `CalendarHandler` with `List`, `AddICal`, `SyncICal`
- **New sync-worker module**: `services/sync-worker/src/sync_worker/ical_client.py` — httpx fetch (10s timeout, 5 MB cap), icalendar parse, RRULE expand
- **New sync-worker endpoint**: `POST /sync/ical` in `main.py` — same datetime validation + error handling as `/sync`
- **New sync-worker tests**: `services/sync-worker/tests/test_ical_client.py` — 9 unit tests, all passing; network tests gated with `@pytest.mark.integration`
- **Frontend hooks**: `useCalendars()`, `useAddICalCalendar()`, `useSyncICal()` in `web/src/lib/api/hooks.ts`
- **Settings Calendars card**: shows connected calendars with kind badges, "Add iCal URL" inline form, "Connect Google Calendar" link
- **Onboarding step 5**: `ObCalendar` now shows iCal inline form (name + URL inputs) as an alternative to Google OAuth

| Endpoint | Auth | Notes |
|---|---|---|
| `GET /v1/calendars` | JWT | Lists all household calendars |
| `POST /v1/calendars/ical` | JWT | Body: `{name, url}` — creates ical_url calendar |
| `POST /v1/calendars/:id/sync-ical` | JWT | Body: `{range_start, range_end}` — syncs iCal feed |

## Shopping List Auto-Generation (2026-04-24)

New migration `20260425000020_shopping.sql` adds three tables:
- `shopping_lists` — one active list per household at a time
- `shopping_list_items` — line items with aisle, amount, unit, source_recipes provenance
- `pantry_staples` — recurring items always appended to generated lists

**Aggregation logic** (`internal/service/shopping.go`):
- Joins `meal_plan_entries → recipes → recipe_ingredients` for the date range
- Aisle from `ingredient_canonical.category` via LEFT JOIN (falls back to `"other"`)
- Same ingredient name (case-insensitive) + same unit → amounts summed
- **V1 limitation**: different units for the same ingredient are kept as separate line items — no unit conversion (e.g. `1 lb butter` + `4 tbsp butter` stay separate). Noted here per spec instructions.

| Endpoint | Auth | Notes |
|---|---|---|
| `POST /v1/shopping/generate` | JWT | Body: `{date_from, date_to}` — deactivates old list, creates new one from meal plan |
| `GET /v1/shopping/current` | JWT | Returns active list with items grouped by aisle |
| `GET /v1/shopping/staples` | JWT | Lists pantry staples |
| `POST /v1/shopping/staples` | JWT | Upsert staple: `{name, amount, unit, aisle}` |
| `DELETE /v1/shopping/staples/:id` | JWT | Remove staple |
| `GET /v1/ingredients/search?q=` | JWT | Full-text search against `ingredient_canonical` |

**Frontend**: `useGenerateShoppingList()` hook added to `web/src/lib/api/hooks.ts`; "Generate shopping list" button on the MealPlan screen calls `POST /v1/shopping/generate` for the current ISO week and navigates to `/shopping` on success.

## To do (next iteration)

1. **PIN lockout counter** — store failed attempts in Redis or Postgres, enforce `cfg.Auth.PINMaxAttempts`
2. **Refresh tokens** — store in DB or Redis, implement `/v1/auth/refresh`
3. **Calendar password encryption** — `password_encrypted` field is stored plaintext; wire proper AES-GCM or KMS encryption
4. **Expand integration tests** — members, lists, WS client connect test with MemoryBroadcaster, admin audit endpoint
5. **S3 backup upload** — implement real AWS S3 upload in `BackupService`
6. **Audit for member/household mutations** — extend `MemberService` and `HouseholdService` to call `AuditService.Log`

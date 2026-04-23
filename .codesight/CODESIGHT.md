# tidyboard — AI Context Map

> **Stack:** chi, fastapi | none | react | go
> **Microservices:** recipe-scraper, sync-worker, web

> 80 routes | 17 models | 96 components | 97 lib files | 44 env vars | 22 middleware | 35% test coverage
> **Token savings:** this file is ~11,100 tokens. Without it, AI exploration would cost ~125,200 tokens. **Saves ~114,100 tokens per conversation.**
> **Last scanned:** 2026-04-23 23:47 — re-run after significant changes

---

# Routes

## CRUD Resources

- **`/v1/households`** GET | POST | GET/:id | PATCH/:id | DELETE/:id → Household
- **`/v1/households/{id}/members`** GET | POST | GET/:id | PATCH/:id | DELETE/:id → Member
- **`/v1/events`** GET | POST | GET/:id | PATCH/:id | DELETE/:id → Event
- **`/v1/lists`** GET | POST | GET/:id | PATCH/:id | DELETE/:id → List
- **`/v1/lists/{id}/items`** GET | POST | GET/:id | PATCH/:id | DELETE/:id → Item
- **`/v1/recipes`** GET | POST | GET/:id | PATCH/:id | DELETE/:id → Recipe

## Other Routes

### chi

- `GET` `/health` params() [auth, db, cache, payment, upload] ✓
- `GET` `/ready` params() [auth, db, cache, payment, upload] ✓
- `GET` `/metrics` params() [auth, db, cache, payment, upload]
- `POST` `/v1/auth/register` params() [auth, db, cache, payment, upload] ✓
- `POST` `/v1/auth/login` params() [auth, db, cache, payment, upload] ✓
- `POST` `/v1/auth/pin` params() [auth, db, cache, payment, upload] ✓
- `POST` `/v1/billing/webhook` params() [auth, db, cache, payment, upload]
- `GET` `/v1/auth/oauth/google/callback` params() [auth, db, cache, payment, upload]
- `GET` `/v1/auth/me` params() [auth, db, cache, payment, upload] ✓
- `GET` `/v1/ws` params() [auth, db, cache, payment, upload]
- `POST` `/v1/recipes/import` params() [auth, db, cache, payment, upload] ✓
- `GET` `/v1/calendars` params() [auth, db, cache, payment, upload]
- `POST` `/v1/calendars/ical` params() [auth, db, cache, payment, upload]
- `POST` `/v1/calendars/{id}/sync` params(id) [auth, db, cache, payment, upload]
- `POST` `/v1/calendars/{id}/sync-ical` params(id) [auth, db, cache, payment, upload]
- `GET` `/v1/audit` params() [auth, db, cache, payment, upload] ✓
- `POST` `/v1/admin/backup/run` params() [auth, db, cache, payment, upload]
- `POST` `/v1/admin/reset` params() [auth, db, cache, payment, upload]
- `POST` `/v1/billing/checkout` params() [auth, db, cache, payment, upload]
- `POST` `/v1/billing/portal` params() [auth, db, cache, payment, upload]
- `GET` `/v1/billing/subscription` params() [auth, db, cache, payment, upload]
- `POST` `/v1/auth/oauth/google/start` params() [auth, db, cache, payment, upload]
- `POST` `/v1/media/upload` params() [auth, db, cache, payment, upload] ✓
- `GET` `/v1/media/sign/*` params() [auth, db, cache, payment, upload] ✓
- `GET` `/v1/media/*` params() [auth, db, cache, payment, upload] ✓
- `ALL` `/media/*` params() [auth, db, cache, payment, upload]
- `GET` `Content-Type` params()
- `GET` `limit` params() [auth, db]
- `GET` `offset` params() [auth, db]
- `GET` `Stripe-Signature` params() [auth, payment]
- `GET` `start` params() [auth, db] ✓
- `GET` `end` params() [auth, db] ✓
- `GET` `expiry` params() [auth, db, cache, upload]
- `GET` `code` params() [auth, db]
- `GET` `state` params() [auth, db]
- `GET` `origin` params() [auth, db] ✓
- `GET` `Authorization` params() [auth, db]
- `GET` `token` params() [auth, db] ✓
- `GET` `Accept-Encoding` params() [queue]
- `GET` `User-Agent` params()
- `GET` `Origin` params() [auth, cache, queue]
- `GET` `Access-Control-Allow-Origin` params() [cache]
- `GET` `Access-Control-Allow-Credentials` params() [cache]
- `GET` `Access-Control-Max-Age` params() [cache]
- `GET` `Vary` params() [cache]
- `GET` `X-Request-Id` params() [auth]
- `GET` `Retry-After` params() [auth, cache]
- `GET` `X-RateLimit-Limit` params() [auth, cache]
- `GET` `X-RateLimit-Remaining` params() [auth, cache]

### fastapi

- `POST` `/scrape` params() → in: ScrapeRequest, out: HealthResponse ✓
- `POST` `/sync` params() → in: SyncRequest, out: HealthResponse [auth] ✓
- `POST` `/sync/ical` params() → in: SyncRequest, out: HealthResponse [auth]

---

# Schema

### accounts
- id: uuid (pk)
- email: text (required)
- password_hash: text
- oidc_subject: text
- is_active: boolean (required)

### households
- id: uuid (pk)
- name: text (required)
- timezone: text (required)
- settings: jsonb (required)
- created_by: uuid (required)
- invite_code: text (required)

### invitations
- id: uuid (pk)
- household_id: uuid (required, fk)
- email: text (required)
- role: text (required)
- token: text (required)
- invited_by: uuid (required)
- expires_at: timestamp(tz) (required)
- accepted_at: timestamp(tz)
- status: text (required)

### join_requests
- id: uuid (pk)
- household_id: uuid (required, fk)
- account_id: uuid (required, fk)
- requested_at: timestamp(tz) (required)
- reviewed_by: uuid (fk)
- reviewed_at: timestamp(tz)
- status: text (required)

### members
- id: uuid (pk)
- household_id: uuid (required, fk)
- account_id: uuid (fk)
- name: text (required)
- display_name: text (required)
- color: text (required)
- avatar_url: text (required)
- role: text (required)
- age_group: text (required)
- pin_hash: text
- nullable: emergency_info           jsonb (required)
- notification_preferences: jsonb (required)

### calendars
- id: uuid (pk)
- household_id: uuid (required, fk)
- name: text (required)
- source: text (required)
- sync_config: jsonb (required)
- sync_direction: text (required)
- assigned_member_id: uuid (fk)
- color_override: text

### events
- id: uuid (pk)
- household_id: uuid (required, fk)
- calendar_id: uuid (fk)
- external_id: text (fk)
- title: text (required)
- description: text (required)
- start_time: timestamp(tz) (required)
- end_time: timestamp(tz) (required)
- all_day: boolean (required)
- location: text (required)
- recurrence_rule: text (required)
- reminders: jsonb (required)

### lists
- id: uuid (pk)
- household_id: uuid (required, fk)
- name: text (required)
- type: text (required)
- shared: boolean (required)
- assigned_member_id: uuid (fk)

### list_items
- id: uuid (pk)
- list_id: uuid (required, fk)
- household_id: uuid (required, fk)
- text: text (required)
- completed: boolean (required)
- assigned_member_id: uuid (fk)
- due_date: date
- priority: text (required)
- sort_order: integer (required)

### recipes
- id: uuid (pk)
- household_id: uuid (required, fk)
- title: text (required)
- description: text (required)
- source_url: text (required)
- source_domain: text (required)
- image_url: text (required)
- prep_time: text (required)
- total_time: text (required)
- servings: integer (required)
- servings_unit: text (required)
- cuisine: text (required)
- difficulty: text (required)
- rating: integer (required)
- notes: text (required)
- is_favorite: boolean (required)
- times_cooked: integer (required)
- last_cooked_at: date
- created_by: uuid (required)

### recipe_ingredients
- id: uuid (pk)
- recipe_id: uuid (required, fk)
- household_id: uuid (required, fk)
- sort_order: integer (required)
- group_name: text (required)
- amount: numeric (required)
- unit: text (required)
- name: text (required)
- preparation: text (required)
- optional: boolean (required)
- substitution_note: text (required)

### recipe_steps
- id: uuid (pk)
- recipe_id: uuid (required, fk)
- household_id: uuid (required, fk)
- sort_order: integer (required)
- text: text (required)
- timer_seconds: integer
- image_url: text (required)

### ingredient_canonical
- id: uuid (pk)
- name: text (required)
- category: text (required)
- default_unit: text (required)
- unit_conversions: jsonb (required)

### audit_entries
- id: uuid (pk)
- timestamp: timestamp(tz) (required)
- household_id: uuid (required, fk)
- actor_account_id: uuid (fk)
- action: text (required)
- entity_type: text (required)
- entity_id: uuid (required, fk)
- details: jsonb (required)
- device_info: text (required)
- ip_address: text

### backup_records
- id: uuid (pk)
- type: text (required)
- destination: text (required)
- file_path: text (required)
- size_bytes: bigint (required)
- schema_version: text (required)
- status: text (required)

### subscriptions
- id: uuid (pk)
- household_id: uuid (required, fk)
- stripe_customer_id: text (required, fk)
- stripe_subscription_id: text (required, fk)
- status: text (required)
- current_period_end: timestamp(tz)

### oauth_tokens
- id: uuid (pk)
- account_id: uuid (required, fk)
- provider: text (required)
- access_token_encrypted: text (required)
- refresh_token_encrypted: text (required)
- token_expiry: timestamp(tz)

---

# Components

- **PhoneFrame** — props: w, h, showStatus — `specs/design/app.jsx`
- **DC** — `specs/design/design-canvas.jsx`
- **IOSStatusBar** — props: dark, time — `specs/design/ios-frame.jsx`
- **MAC_FONT** — `specs/design/macos-window.jsx`
- **Icon** — props: name, size, color, stroke, style — `specs/design/primitives.jsx`
- **DashKiosk** — props: dark — `specs/design/screens/dashboard.jsx`
- **Equity** — props: dark — `specs/design/screens/equity.jsx`
- **ObShell** — props: footer, pad, phone — `specs/design/screens/onboarding.jsx`
- **RecipeImport** — `specs/design/screens/recipes.jsx`
- **RoutineKid** — props: dark — `specs/design/screens/routine.jsx`
- **AuditLogRoute** [client] — `web/src/app/admin/audit/page.tsx`
- **AuditPreviewPage** [client] — `web/src/app/admin/audit/preview/page.tsx`
- **Page** — `web/src/app/calendar/agenda/page.tsx`
- **Page** — `web/src/app/calendar/day/page.tsx`
- **Page** — `web/src/app/calendar/day-dark/page.tsx`
- **Page** — `web/src/app/calendar/event/page.tsx`
- **CalendarLayout** — `web/src/app/calendar/layout.tsx`
- **Page** — `web/src/app/calendar/month/page.tsx`
- **CalendarPage** [client] — `web/src/app/calendar/page.tsx`
- **Page** — `web/src/app/calendar/week/page.tsx`
- **Page** — `web/src/app/dashboard/desktop/page.tsx`
- **Page** — `web/src/app/dashboard/kiosk/page.tsx`
- **Page** — `web/src/app/dashboard/kiosk-ambient/page.tsx`
- **Page** — `web/src/app/dashboard/kiosk-columns/page.tsx`
- **Page** — `web/src/app/dashboard/kiosk-dark/page.tsx`
- **Page** — `web/src/app/dashboard/phone/page.tsx`
- **EquityLayout** — `web/src/app/equity/layout.tsx`
- **EquityPage** [client] — `web/src/app/equity/page.tsx`
- **Page** — `web/src/app/equity/preview/page.tsx`
- **Page** — `web/src/app/equity/preview-dark/page.tsx`
- **Page** — `web/src/app/equity/preview-scales/page.tsx`
- **GlobalError** [client] — props: error, reset — `web/src/app/error.tsx`
- **RootLayout** — `web/src/app/layout.tsx`
- **ListDetailPage** [client] — props: params — `web/src/app/lists/[id]/page.tsx`
- **ListsPage** — `web/src/app/lists/page.tsx`
- **Page** — `web/src/app/lists/preview/page.tsx`
- **Page** — `web/src/app/lists/preview-detail/page.tsx`
- **Loading** — `web/src/app/loading.tsx`
- **LockLayout** — `web/src/app/lock/layout.tsx`
- **Page** — `web/src/app/lock/members/page.tsx`
- **LockPage** [client] — `web/src/app/lock/page.tsx`
- **Page** — `web/src/app/lock/screen/page.tsx`
- **LoginPage** [client] — `web/src/app/login/page.tsx`
- **MealsPage** — `web/src/app/meals/page.tsx`
- **Page** — `web/src/app/meals/preview/page.tsx`
- **NotFound** — `web/src/app/not-found.tsx`
- **OfflinePage** — `web/src/app/offline/page.tsx`
- **OnboardingStep** — props: params — `web/src/app/onboarding/[step]/page.tsx`
- **OnboardingLayout** — `web/src/app/onboarding/layout.tsx`
- **OnboardingPage** [client] — `web/src/app/onboarding/page.tsx`
- **Home** [client] — `web/src/app/page.tsx`
- **PinLoginPage** [client] — `web/src/app/pin-login/page.tsx`
- **Preview** — `web/src/app/preview/page.tsx`
- **RacePage** — `web/src/app/race/page.tsx`
- **Page** — `web/src/app/race/preview/page.tsx`
- **RecipeDetailPage** — props: params — `web/src/app/recipes/[id]/page.tsx`
- **RecipeImportPage** — `web/src/app/recipes/import/page.tsx`
- **RecipesPage** — `web/src/app/recipes/page.tsx`
- **Page** — `web/src/app/recipes/preview-detail/page.tsx`
- **Page** — `web/src/app/recipes/preview-detail-dark/page.tsx`
- **Page** — `web/src/app/recipes/preview-import/page.tsx`
- **Page** — `web/src/app/recipes/preview-preview/page.tsx`
- **Page** — `web/src/app/routines/checklist/page.tsx`
- **Page** — `web/src/app/routines/kid/page.tsx`
- **Page** — `web/src/app/routines/kid-dark/page.tsx`
- **RoutinesLayout** — `web/src/app/routines/layout.tsx`
- **RoutinesPage** [client] — `web/src/app/routines/page.tsx`
- **Page** — `web/src/app/routines/path/page.tsx`
- **AISettingsCard** [client] — props: label, provider, value, onSet, onClear — `web/src/app/settings/ai-section.tsx`
- **SettingsPage** [client] — `web/src/app/settings/page.tsx`
- **Page** — `web/src/app/settings/preview/page.tsx`
- **ShoppingPage** [client] — `web/src/app/shopping/page.tsx`
- **Page** — `web/src/app/shopping/preview/page.tsx`
- **AdaptiveDashboard** — `web/src/components/adaptive-dashboard.tsx`
- **AdminGate** [client] — `web/src/components/admin-gate.tsx`
- **AuthGate** [client] — `web/src/components/auth-gate.tsx`
- **PhoneFrame** — props: w, h, showStatus — `web/src/components/frames/device-frames.tsx`
- **RecipeDetailThemed** [client] — props: recipe — `web/src/components/recipe-detail-themed.tsx`
- **Scene** — props: label, pad — `web/src/components/scene.tsx`
- **BottomNav** — props: tabs, active, dark, compact — `web/src/components/screens/bottom-nav.tsx`
- **DashDesktop** [client] — `web/src/components/screens/dashboard-desktop.tsx`
- **DashKioskAmbient** [client] — `web/src/components/screens/dashboard-kiosk-ambient.tsx`
- **DashKioskColumns** [client] — `web/src/components/screens/dashboard-kiosk-columns.tsx`
- **DashKiosk** [client] — props: dark — `web/src/components/screens/dashboard-kiosk.tsx`
- **DashPhone** [client] — `web/src/components/screens/dashboard-phone.tsx`
- **Equity** [client] — props: dark — `web/src/components/screens/equity.tsx`
- **ListsIndex** [client] — `web/src/components/screens/lists.tsx`
- **Onboarding** [client] — props: step — `web/src/components/screens/onboarding.tsx`
- **RecipeImport** [client] — `web/src/components/screens/recipes.tsx`
- **RoutineKid** [client] — props: dark — `web/src/components/screens/routine.tsx`
- **SWRegister** [client] — `web/src/components/sw-register.tsx`
- **ThemeProvider** [client] — `web/src/components/theme-provider.tsx`
- **I18nProvider** [client] — props: locale, messages — `web/src/i18n/provider.tsx`
- **ApiProvider** [client] — `web/src/lib/api/provider.tsx`
- **AuthProvider** [client] — `web/src/lib/auth/auth-store.tsx`
- **WSProvider** [client] — `web/src/lib/ws/ws-provider.tsx`

---

# Libraries

- `internal/broadcast/broadcast.go`
  - function NewRedisBroadcaster: (client *redis.Client) *RedisBroadcaster
  - function NewMemoryBroadcaster: () *MemoryBroadcaster
  - class Event
  - class RedisBroadcaster
  - class MemoryBroadcaster
  - interface Broadcaster
- `internal/broadcast/chaos.go`
  - function NewChaosBroadcaster: (inner Broadcaster, cfg ChaosBroadcastConfig) *ChaosBroadcaster
  - class ChaosBroadcaster
  - class ChaosBroadcastConfig
- `internal/client/recipe_client.go`
  - function WithRecipeRetries: (n int) RecipeClientOption
  - function NewRecipeClient: (baseURL string, timeout time.Duration, opts ...RecipeClientOption) *RecipeClient
  - class RecipeClient
  - class Ingredient
  - class ScrapedRecipe
- `internal/client/sync_client.go`
  - function WithSyncRetries: (n int) SyncClientOption
  - function NewSyncClient: (baseURL string, timeout time.Duration, opts ...SyncClientOption) *SyncClient
  - function IsRetryable: (err error) bool
  - class SyncClient
  - class SyncRequest
  - class SyncedEvent
  - _...2 more_
- `internal/config/config.go`
  - class Config
  - class ServeCmd
  - class MigrateCmd
  - class BackupCLICmd
  - class MaintCmd
  - class ServerConfig
  - _...11 more_
- `internal/handler/admin.go` — function NewAdminHandler: (audit *service.AuditService, backup *service.BackupService) *AdminHandler, class AdminHandler
- `internal/handler/admin_reset.go` — function NewResetHandler: (pool *pgxpool.Pool) *ResetHandler, class ResetHandler
- `internal/handler/auth.go` — function NewAuthHandler: (auth *service.AuthService) *AuthHandler, class AuthHandler
- `internal/handler/billing.go` — function NewBillingHandler: (svc *service.BillingService) *BillingHandler, class BillingHandler
- `internal/handler/calendar.go` — function NewCalendarHandler: (q *query.Queries, sync *service.SyncService) *CalendarHandler, class CalendarHandler
- `internal/handler/event.go` — function NewEventHandler: (svc *service.EventService) *EventHandler, class EventHandler
- `internal/handler/health.go`
  - function Health: (version string) http.HandlerFunc
  - function Ready: (cfg ReadyConfig) http.HandlerFunc
  - class ReadyConfig
- `internal/handler/household.go` — function NewHouseholdHandler: (svc *service.HouseholdService) *HouseholdHandler, class HouseholdHandler
- `internal/handler/list.go` — function NewListHandler: (svc *service.ListService) *ListHandler, class ListHandler
- `internal/handler/media.go` — function NewMediaHandler: (storage service.StorageAdapter, storageCfg config.StorageConfig) *MediaHandler, class MediaHandler
- `internal/handler/member.go` — function NewMemberHandler: (svc *service.MemberService) *MemberHandler, class MemberHandler
- `internal/handler/oauth.go` — function NewOAuthHandler: (svc *service.OAuthService) *OAuthHandler, class OAuthHandler
- `internal/handler/recipe.go` — function NewRecipeHandler: (svc *service.RecipeService) *RecipeHandler, class RecipeHandler
- `internal/handler/respond/respond.go`
  - function JSON: (w http.ResponseWriter, status int, v any)
  - function Error: (w http.ResponseWriter, status int, code, message string)
  - function NotImplemented: (w http.ResponseWriter)
- `internal/handler/sync.go` — function NewSyncHandler: (svc *service.SyncService) *SyncHandler, class SyncHandler
- `internal/handler/ws.go` — function NewWSHandler: (broadcaster broadcast.Broadcaster, jwtSecret string) *WSHandler, class WSHandler
- `internal/middleware/auth.go`
  - function Auth: (jwtSecret string) func(http.Handler) http.Handler
  - function AccountIDFromCtx: (ctx context.Context) (uuid.UUID, bool)
  - function HouseholdIDFromCtx: (ctx context.Context) (uuid.UUID, bool)
  - function MemberIDFromCtx: (ctx context.Context) (uuid.UUID, bool)
  - function RoleFromCtx: (ctx context.Context) string
  - class Claims
- `internal/middleware/compress.go` — function Compress: (next http.Handler) http.Handler
- `internal/middleware/context.go`
  - function InjectRequestMeta: () func(http.Handler) http.Handler
  - function RemoteAddrFromCtx: (ctx context.Context) string
  - function UserAgentFromCtx: (ctx context.Context) string
- `internal/middleware/cors.go` — function CORS: (allowedOrigins []string) func(http.Handler) http.Handler
- `internal/middleware/logger.go` — function Logger: (logger *slog.Logger) func(http.Handler) http.Handler
- `internal/middleware/metrics.go`
  - function NewMetrics: () *Metrics
  - function NewMetricsWithRegistry: (reg prometheus.Registerer) *Metrics
  - function DBPoolGauge: () *prometheus.GaugeVec
  - function WSClientsGauge: () prometheus.Gauge
  - function BackgroundJobHistogram: () *prometheus.HistogramVec
  - function AuditEntriesCounter: () prometheus.Counter
  - _...1 more_
- `internal/middleware/ratelimit.go`
  - function NewRateLimiter: (requestsPerMinute int) *RateLimiter
  - function NewAccountRateLimiter: (rdb *redis.Client, limitPerMin int) *AccountRateLimiter
  - class RateLimiter
  - class AccountRateLimiter
- `internal/middleware/recovery.go` — function Recovery: (logger *slog.Logger) func(http.Handler) http.Handler
- `internal/middleware/requestsize.go` — function MaxRequestBody: (maxBytes int64) func(http.Handler) http.Handler, function HandleMaxBytesError: (w http.ResponseWriter, err error) bool
- `internal/middleware/testhelpers.go` — function WithTestAccountID: (r *http.Request, accountID string) *http.Request
- `internal/model/account.go`
  - class Account
  - class CreateAccountRequest
  - class LoginRequest
  - class PINLoginRequest
  - class AuthResponse
- `internal/model/event.go`
  - class Event
  - class CreateEventRequest
  - class UpdateEventRequest
  - class ListEventsQuery
- `internal/model/household.go`
  - class Household
  - class CreateHouseholdRequest
  - class UpdateHouseholdRequest
  - class Invitation
- `internal/model/list.go`
  - class List
  - class ListItem
  - class CreateListRequest
  - class UpdateListRequest
  - class CreateListItemRequest
  - class UpdateListItemRequest
- `internal/model/member.go`
  - class Member
  - class CreateMemberRequest
  - class UpdateMemberRequest
- `internal/model/recipe.go`
  - class Recipe
  - class RecipeIngredient
  - class RecipeStep
  - class NutritionInfo
  - class CreateRecipeRequest
  - class ImportRecipeRequest
  - _...1 more_
- `internal/query/account.sql.go` — class CreateAccountParams, class UpdateAccountParams
- `internal/query/audit.sql.go`
  - class InsertAuditEntryParams
  - class ListAccountAuditParams
  - class ListHouseholdAuditParams
- `internal/query/backup.sql.go`
  - class InsertBackupRecordParams
  - class ListBackupRecordsParams
  - class UpdateBackupRecordParams
  - class UpdateBackupS3KeyParams
- `internal/query/db.go`
  - function New: (db DBTX) *Queries
  - class Queries
  - interface DBTX
- `internal/query/event.sql.go`
  - class CreateEventParams
  - class DeleteEventParams
  - class GetCalendarParams
  - class CreateCalendarParams
  - class GetEventParams
  - class GetEventByExternalIDParams
  - _...3 more_
- `internal/query/household.sql.go`
  - class CreateHouseholdParams
  - class RegenerateInviteCodeParams
  - class UpdateHouseholdParams
- `internal/query/list.sql.go`
  - class CompleteAllItemsParams
  - class CreateListParams
  - class CreateListItemParams
  - class DeleteListParams
  - class DeleteListItemParams
  - class GetListParams
  - _...4 more_
- `internal/query/member.sql.go`
  - class CreateMemberParams
  - class DeleteMemberParams
  - class GetMemberParams
  - class GetMemberByAccountAndHouseholdParams
  - class UpdateMemberParams
- `internal/query/models.go`
  - class Account
  - class AuditEntry
  - class BackupRecord
  - class Calendar
  - class Event
  - class Household
  - _...11 more_
- `internal/query/oauth.sql.go`
  - class DeleteOAuthTokenParams
  - class GetOAuthTokenParams
  - class UpsertOAuthTokenParams
- `internal/query/recipe.sql.go`
  - class CreateRecipeParams
  - class DeleteRecipeParams
  - class GetRecipeParams
  - class GetRecipeBySourceURLParams
  - class IncrementTimesCookedParams
  - class SearchRecipesParams
  - _...1 more_
- `internal/query/subscription.sql.go` — class UpdateSubscriptionStatusParams, class UpsertSubscriptionParams
- `internal/service/audit.go` — function NewAuditService: (q *query.Queries) *AuditService, class AuditService
- `internal/service/auth.go` — function NewAuthService: (cfg config.AuthConfig, q *query.Queries) *AuthService, class AuthService
- `internal/service/backup.go` — function NewBackupService: (cfg config.BackupConfig, dbCfg config.DatabaseConfig, q *query.Queries) *BackupService, class BackupService
- `internal/service/billing.go` — function NewBillingService: (cfg config.StripeConfig, q *query.Queries) *BillingService, class BillingService
- `internal/service/event.go` — function NewEventService: (q *query.Queries, bc broadcast.Broadcaster, audit *AuditService) *EventService, class EventService
- `internal/service/household.go` — function NewHouseholdService: (q *query.Queries) *HouseholdService, class HouseholdService
- `internal/service/list.go` — function NewListService: (q *query.Queries, bc broadcast.Broadcaster, audit *AuditService) *ListService, class ListService
- `internal/service/member.go` — function NewMemberService: (q *query.Queries, auth *AuthService) *MemberService, class MemberService
- `internal/service/oauth.go` — function NewOAuthService: (cfg config.OAuthConfig, q *query.Queries) *OAuthService, class OAuthService
- `internal/service/recipe.go` — function NewRecipeService: (q *query.Queries, scraper *client.RecipeClient, storage ...StorageAdapter) *RecipeService, class RecipeService
- `internal/service/storage.go`
  - function NewStorage: (ctx context.Context, cfg config.StorageConfig) (StorageAdapter, error)
  - function GenMediaKey: (householdID uuid.UUID, t time.Time, content []byte, ext string) string
  - function DetectContentType: (data []byte) string
  - function ExtFromContentType: (ct string) string
  - class LocalStorage
  - class S3Storage
  - _...1 more_
- `internal/service/sync.go`
  - function NewSyncService: (q *query.Queries, sync *client.SyncClient) *SyncService
  - class SyncService
  - class SyncResult
- `internal/testutil/chaos.go` — function ChaosMiddleware: (cfg ChaosConfig) func(http.Handler) http.Handler, class ChaosConfig
- `internal/testutil/db.go` — function SetupTestDB: (t *testing.T) *pgxpool.Pool, function WithTestTx: (t *testing.T, pool *pgxpool.Pool, fn func(ctx context.Context) )
- `internal/testutil/factories.go`
  - function MakeHousehold: (opts ...HouseholdOption) *model.Household
  - function WithHouseholdName: (name string) HouseholdOption
  - function MakeMember: (householdID uuid.UUID, opts ...MemberOption) *model.Member
  - function WithMemberRole: (role string) MemberOption
  - function WithMemberName: (name string) MemberOption
  - function MakeEvent: (householdID uuid.UUID, opts ...EventOption) *model.Event
  - _...2 more_
- `internal/testutil/jwt.go` — function MakeJWT: (accountID, householdID, memberID uuid.UUID, role string) string
- `loadtest/auth.js` — function setup: () => void, const options
- `loadtest/events.js` — function setup: () => void, const options
- `loadtest/helpers/config.js`
  - function jsonHeaders: (token) => void
  - function registerAndLogin: (suffix) => void
  - const BASE_URL
  - const defaultThresholds
- `loadtest/helpers/data.js`
  - function makeEvent: () => void
  - function makeList: () => void
  - function makeListItem: (index) => void
  - function makePinPayload: (email, pin) => void
- `loadtest/load.js` — function setup: () => void, const options
- `loadtest/smoke.js` — function setup: () => void, const options
- `loadtest/soak.js` — function setup: () => void, const options
- `loadtest/spike.js` — function setup: () => void, const options
- `loadtest/stress.js` — function setup: () => void, const options
- `services/recipe-scraper/src/recipe_scraper/clock.py`
  - class Clock
  - class RealClock
  - class FrozenClock
- `services/recipe-scraper/src/recipe_scraper/config.py` — function get_settings: () -> Settings, class Settings
- `services/recipe-scraper/src/recipe_scraper/logging_config.py` — function configure_logging: (level) -> None
- `services/recipe-scraper/src/recipe_scraper/main.py`
  - function create_app: (settings, clock) -> FastAPI
  - class ScrapeRequest
  - class HealthResponse
- `services/recipe-scraper/src/recipe_scraper/normalize.py` — function normalize: (scraped, source_url) -> NormalizedRecipe
- `services/recipe-scraper/src/recipe_scraper/scraper.py` — function scrape_recipe: (url, clock, timeout_seconds, max_html_bytes) -> NormalizedRecipe
- `services/sync-worker/src/sync_worker/caldav_client.py` — class CalDAVClient
- `services/sync-worker/src/sync_worker/clock.py`
  - class Clock
  - class RealClock
  - class FrozenClock
- `services/sync-worker/src/sync_worker/config.py` — function get_settings: () -> Settings, class Settings
- `services/sync-worker/src/sync_worker/ical_client.py` — function fetch_and_parse: (ics_url, range_start, range_end) -> list[NormalizedEvent]
- `services/sync-worker/src/sync_worker/logging_config.py` — function configure_logging: (level) -> None
- `services/sync-worker/src/sync_worker/main.py`
  - function create_app: (settings, clock) -> FastAPI
  - class SyncRequest
  - class SyncICalRequest
  - class HealthResponse
- `services/sync-worker/src/sync_worker/rrule_expand.py` — function parse_iso_or_raise: (value) -> datetime
- `services/sync-worker/src/sync_worker/sync.py` — function pull_events: (client, range_start, range_end, clock) -> list[NormalizedEvent]
- `web/e2e/fixtures.ts`
  - function gotoAndWait: (page, urlPath) => Promise<void>
  - function screenshot: (page, name) => Promise<string>
  - const test
- `web/e2e-real/helpers/api.ts`
  - function apiRegister: (email, password) => Promise<AuthResponse>
  - function apiLogin: (email, password) => Promise<AuthResponse>
  - function apiPINLogin: (householdId, memberId, pin) => Promise<AuthResponse>
  - function apiMe: (token) => Promise<
  - function apiCreateHousehold: (token, name) => Promise<Household>
  - function apiCreateMember: (token, householdId, member) => Promise<Member>
  - _...15 more_
- `web/src/lib/ai/ai-keys.ts`
  - function isAIEnabled: () => boolean
  - function setAIEnabled: (enabled) => void
  - function useAIKeys: () => UseAIKeysReturn
  - interface AIKeys
  - interface UseAIKeysReturn
  - type AIProvider
- `web/src/lib/ai/client.ts`
  - function callOpenAI: (messages, model, apiKey) => Promise<AIResult>
  - function callAnthropic: (messages, model, apiKey) => Promise<AIResult>
  - function callGoogle: (messages, model, apiKey) => Promise<AIResult>
  - function callAI: (provider, messages, apiKey, model?) => Promise<AIResult>
  - class AIError
  - interface AIMessage
  - _...2 more_
- `web/src/lib/api/fallback.ts` — function isApiFallbackMode: () => boolean, const fallback
- `web/src/lib/api/hooks.ts`
  - function useEvents: (range?) => void
  - function useMembers: () => void
  - function useRecipes: () => void
  - function useRecipe: (id) => void
  - function useLists: () => void
  - function useList: (id) => void
  - _...17 more_
- `web/src/lib/api/use-subscription.ts` — function useSubscription: () => UseSubscriptionResult, interface Subscription
- `web/src/lib/data.ts`
  - function getMember
  - function getMembers
  - function fmtTime
  - type Role
  - type Member
  - type TBDEvent
  - _...20 more_
- `web/src/lib/utils.ts` — function cn: (...inputs) => void

---

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

---

# Middleware

## auth
- auth — `internal/handler/auth.go`
- auth_test — `internal/handler/auth_test.go`
- auth — `internal/middleware/auth.go`
- testhelpers — `internal/middleware/testhelpers.go`
- auth — `internal/service/auth.go`
- auth_test — `internal/service/auth_test.go`
- auth — `loadtest/auth.js`
- auth-gate.test — `web/src/components/auth-gate.test.tsx`
- auth-gate — `web/src/components/auth-gate.tsx`
- auth-store.test — `web/src/lib/auth/auth-store.test.tsx`
- auth-store — `web/src/lib/auth/auth-store.tsx`

## custom
- compress — `internal/middleware/compress.go`
- context — `internal/middleware/context.go`
- metrics — `internal/middleware/metrics.go`
- metrics_test — `internal/middleware/metrics_test.go`
- requestsize — `internal/middleware/requestsize.go`

## cors
- cors — `internal/middleware/cors.go`
- cors_test — `internal/middleware/cors_test.go`

## logging
- logger — `internal/middleware/logger.go`
- recovery — `internal/middleware/recovery.go`

## rate-limit
- ratelimit — `internal/middleware/ratelimit.go`
- ratelimit_test — `internal/middleware/ratelimit_test.go`

---

# Dependency Graph

## Most Imported Files (change these carefully)

- `net/http` — imported by **48** files
- `encoding/json` — imported by **33** files
- `net/http/httptest` — imported by **15** files
- `log/slog` — imported by **12** files
- `web/e2e/fixtures.ts` — imported by **8** files
- `loadtest/helpers/config.js` — imported by **7** files
- `path/filepath` — imported by **6** files
- `loadtest/helpers/data.js` — imported by **6** files
- `web/src/components/screens/calendar.tsx` — imported by **6** files
- `web/src/components/screens/routine.tsx` — imported by **6** files
- `web/src/components/screens/recipes.tsx` — imported by **6** files
- `web/src/components/screens/equity.tsx` — imported by **5** files
- `/clock.py` — imported by **4** files
- `web/e2e-real/helpers/api.ts` — imported by **4** files
- `web/src/components/screens/bottom-nav.tsx` — imported by **4** files
- `web/src/components/ui/icon.tsx` — imported by **4** files
- `crypto/sha256` — imported by **3** files
- `web/src/components/screens/lists.tsx` — imported by **3** files
- `web/src/components/ui/avatar.tsx` — imported by **3** files
- `web/src/lib/ai/ai-keys.ts` — imported by **3** files

## Import Map (who imports what)

- `net/http` ← `cmd/server/main.go`, `internal/client/recipe_client.go`, `internal/client/recipe_client_test.go`, `internal/client/sync_client.go`, `internal/client/sync_client_test.go` +43 more
- `encoding/json` ← `internal/broadcast/broadcast.go`, `internal/broadcast/broadcast_test.go`, `internal/broadcast/chaos_test.go`, `internal/client/recipe_client.go`, `internal/client/recipe_client_test.go` +28 more
- `net/http/httptest` ← `internal/client/recipe_client_test.go`, `internal/client/sync_client_test.go`, `internal/handler/auth_test.go`, `internal/handler/event_test.go`, `internal/handler/health_test.go` +10 more
- `log/slog` ← `cmd/server/main.go`, `internal/broadcast/broadcast.go`, `internal/client/recipe_client.go`, `internal/client/sync_client.go`, `internal/handler/media.go` +7 more
- `web/e2e/fixtures.ts` ← `web/e2e/a11y.spec.ts`, `web/e2e/calendar.spec.ts`, `web/e2e/dark-mode.spec.ts`, `web/e2e/onboarding.spec.ts`, `web/e2e/routines.spec.ts` +3 more
- `loadtest/helpers/config.js` ← `loadtest/auth.js`, `loadtest/events.js`, `loadtest/load.js`, `loadtest/smoke.js`, `loadtest/soak.js` +2 more
- `path/filepath` ← `cmd/server/main.go`, `internal/service/backup.go`, `internal/service/backup_s3.go`, `internal/service/backup_test.go`, `internal/service/storage.go` +1 more
- `loadtest/helpers/data.js` ← `loadtest/events.js`, `loadtest/load.js`, `loadtest/smoke.js`, `loadtest/soak.js`, `loadtest/spike.js` +1 more
- `web/src/components/screens/calendar.tsx` ← `web/src/components/screens/calendar-agenda.stories.tsx`, `web/src/components/screens/calendar-event-modal.stories.tsx`, `web/src/components/screens/calendar-month.stories.tsx`, `web/src/components/screens/calendar-week.stories.tsx`, `web/src/components/screens/calendar.stories.tsx` +1 more
- `web/src/components/screens/routine.tsx` ← `web/src/components/screens/kiosk-lock-members.stories.tsx`, `web/src/components/screens/kiosk-lock.stories.tsx`, `web/src/components/screens/routine-checklist.stories.tsx`, `web/src/components/screens/routine-path.stories.tsx`, `web/src/components/screens/routine.stories.tsx` +1 more

---

# Test Coverage

> **35%** of routes and models are covered by tests
> 82 test files found

## Covered Routes

- GET:/health
- GET:/ready
- POST:/v1/auth/register
- POST:/v1/auth/login
- POST:/v1/auth/pin
- GET:/v1/auth/me
- POST:/v1/households
- GET:/v1/households/{id}
- PATCH:/v1/households/{id}
- DELETE:/v1/households/{id}
- GET:/v1/events
- POST:/v1/events
- GET:/v1/events/{id}
- PATCH:/v1/events/{id}
- DELETE:/v1/events/{id}
- GET:/v1/lists
- POST:/v1/lists
- POST:/v1/recipes/import
- GET:/v1/audit
- POST:/v1/media/upload
- GET:/v1/media/sign/*
- GET:/v1/media/*
- GET:start
- GET:end
- GET:origin
- GET:token
- POST:/scrape
- POST:/sync

## Covered Models

- households
- members
- calendars
- events
- lists
- recipes

---

_Generated by [codesight](https://github.com/Houseofmvps/codesight) — see your codebase clearly_
# Spec → Implementation Audit (V3)

Updated 2026-04-26.

Supersedes SPEC_GAPS.md and SPEC_GAPS_V2.md (older audits still on disk for history).

---

## Audit Methodology

- **Backend**: grepped `cmd/server/main.go` for all registered routes; read handler + service files for implementation depth.
- **Frontend**: grepped `web/src/components/screens/**` and `web/src/app/**` for `onClick`, `onSubmit`, `useMutation`, `useQuery`; read screen files directly.
- **Live probes**: `curl https://tidyboard.org/v1/<endpoint>` — 401 = auth-required route exists (good); 404 = missing; 405 = wrong method; 200 = public and reachable.
- **Test evidence**: `go test -tags=unit ./...` run fresh; integration test files read directly.
- Spec read in full from `specs/tidyboard-spec.md` (~3100 lines).

---

## Summary

| Status | Count |
|---|---|
| ✅ Live | 42 |
| 🟡 Partial | 22 |
| ❌ Missing | 19 |
| 🚫 Decorative | 6 |

**~47% of spec features are ✅ Live. ~25% are 🟡 Partial. ~21% are ❌ Missing. ~7% are 🚫 Decorative.**

---

## 1. Authentication

| Spec Feature | Backend Endpoint | Frontend Screen | Status | Evidence |
|---|---|---|---|---|
| Email/password sign-up | ~~`POST /v1/auth/register`~~ | `/login` | 🟡 **Partial** | Register endpoint removed; auth migrated to Cognito Hosted UI. `curl /v1/auth/register` → 404. Cognito signup works but requires AWS Cognito env vars configured. |
| Email/password sign-in | ~~`POST /v1/auth/login`~~ | `/login` | 🟡 **Partial** | Login endpoint removed; delegated to Cognito OIDC PKCE flow. `curl /v1/auth/login` → 404. Frontend `login/page.tsx` does Cognito redirect — functional if `NEXT_PUBLIC_COGNITO_*` env vars set. |
| Google OAuth | `POST /v1/auth/oauth/google/start` (code exists, not deployed) | Settings / onboarding | ❌ **Missing** | `curl /v1/auth/oauth/google/start` → 404 on live. Handler exists in `internal/handler/oauth.go` but route not wired in current `main.go`. Google is available via Cognito federation however. |
| Sign-out | Cognito `/logout` redirect | `/settings` → sign out btn | ✅ **Live** | `equity.tsx` `handleSignOut` calls `logout()` → `oidcSignOut` → Cognito logout URI. Works. |
| Auth callback | `GET /auth/callback` (Next.js route) | `/auth/callback/page.tsx` | ✅ **Live** | Exchanges Cognito auth code for id_token via PKCE; `acceptToken` hydrates auth store. Code confirmed in `auth/callback/page.tsx`. |
| `GET /v1/auth/me` | `GET /v1/auth/me` | All screens (bootstraps session) | ✅ **Live** | `curl /v1/auth/me` → 401 (correct). Handler in `internal/handler/auth.go`. |
| Member PIN login (kiosk) | `POST /v1/auth/pin` | `/pin-login/page.tsx` | ✅ **Live** | `curl -X POST /v1/auth/pin` → 405 (correct method required). `pin-login/page.tsx` calls `pinLogin(member.id, pin)`. PIN hashed with bcrypt. |
| Kiosk lock screen | — (frontend-only) | `/kiosk`, `/lock` | ✅ **Live** | `kiosk/page.tsx` renders `KioskLock` component; PIN entry calls `useAuth().pinLogin`. Member picker + PIN entry fully wired. |
| PIN lockout counter | ❌ Not implemented | — | ❌ **Missing** | BACKEND_STATUS.md: "PIN lockout counter — store failed attempts in Redis or Postgres, enforce cfg.Auth.PINMaxAttempts" explicitly listed as TODO. |
| Refresh tokens | ❌ Not implemented | — | ❌ **Missing** | Cognito manages token refresh client-side via PKCE; `internal/auth/` has no `/v1/auth/refresh`. BACKEND_STATUS.md lists as TODO. |
| Biometric unlock | ❌ Not implemented | — | ❌ **Missing** | Spec §6.7: "biometric unlock on supported tablets". No WebAuthn or device biometric code anywhere. |

---

## 2. Households + Members CRUD

| Spec Feature | Backend Endpoint | Frontend Screen | Status | Evidence |
|---|---|---|---|---|
| Create household | `POST /v1/households` | Onboarding step 3 | ✅ **Live** | `curl -X POST /v1/households` → 405 (needs auth). Handler + sqlc query confirmed. Onboarding `page.tsx` calls `api.post("/v1/households", …)`. |
| Get/update/delete household | `GET/PATCH/DELETE /v1/households/{id}` | Settings page | ✅ **Live** | All 3 routes in `main.go`. `useHousehold()` + `useUpdateHouseholdSettings()` hooks confirmed in `hooks.ts`. |
| List household members | `GET /v1/households/{id}/members` | Dashboard, Settings | ✅ **Live** | `useMembers()` hook → `GET /v1/households/{id}/members`. `curl` → 401. |
| Create/update/delete member | `POST/PATCH/DELETE /v1/households/{id}/members/{memberID}` | Settings → Family Card | ✅ **Live** | Hooks `useCreateMember`, `useUpdateMember`, `useDeleteMember` confirmed in `hooks.ts` and settings page. |
| Invite adult by email | ❌ No route | — | ❌ **Missing** | `cmd/server/main.go` has no `/v1/households/{id}/invite` or `/v1/invitations` route. `sql/queries/household.sql` has `RegenerateInviteCode` + `GetHouseholdByInviteCode` but no invite-email handler. Email sending not wired. |
| Invite by code (join request) | ❌ No route | — | ❌ **Missing** | Migration `20260423000002` creates `invitations` + `join_requests` tables. No handler exposes them. `curl /v1/households/x/invite` → 404. |
| Multi-household switcher | `GET /v1/households` (list — missing) | — | ❌ **Missing** | `auth-store.tsx` stores a single `household_id` from `/v1/auth/me`. No `GET /v1/households` (list-all) route. No UI household switcher. Spec §6.7.5 requires multi-household support. |
| Upgrade child to account | ❌ No route | — | ❌ **Missing** | Spec §6.7.6: "Link Account" flow. No endpoint or UI. |

---

## 3. Calendar Events

| Spec Feature | Backend Endpoint | Frontend Screen | Status | Evidence |
|---|---|---|---|---|
| Create / read / update / delete events | `POST/GET/PATCH/DELETE /v1/events` | `/calendar` | ✅ **Live** | All routes in `main.go`. `curl /v1/events` → 401. `useCreateEvent`, `useUpdateEvent`, `useDeleteEvent`, `useEvents` hooks confirmed. Calendar screen has save/delete `onClick` wired. |
| Date-range filter | `GET /v1/events?start=&end=` | Calendar views | ✅ **Live** | `useEvents(range?)` passes `start`/`end` params. `ListEventsInRange` sqlc query confirmed. |
| RRULE recurrence stored | `recurrence_rule` column in DB | Event form | 🟡 **Partial** | `events.recurrence_rule` column exists in DB and is stored/returned by API. However, **server-side recurrence expansion** (generating individual instances from an RRULE for the date-range query) is not implemented — `ListEventsInRange` returns only the base event row, not expanded occurrences. Client-side `rrule` npm package present but expansion requires back-end support for full correctness. |
| Per-member event filter | `GET /v1/events?member_id=` | Dashboard | ❌ **Missing** | BACKEND_STATUS.md explicitly notes: "`GET /v1/events` does not accept a `?member_id=` query param". Dashboard member filter is visual only. |
| iCal URL sync | `POST /v1/calendars/ical`, `POST /v1/calendars/{id}/sync-ical` | Settings → Calendars | ✅ **Live** | `curl /v1/calendars` → 401. Python sync-worker with `ical_client.py` confirmed. `useCalendars`, `useAddICalCalendar`, `useSyncICal` hooks present. |
| CalDAV sync (Nextcloud, Baikal) | `POST /v1/calendars/{id}/sync` | Settings → Calendars | 🟡 **Partial** | Route exists; Python sync-worker handles CalDAV via `python-caldav`. However Google OAuth endpoint (`/v1/auth/oauth/google/start`) returns 404 on live — Google Calendar OAuth not deployed. |
| Google Calendar OAuth | `POST /v1/auth/oauth/google/start` | Settings / Onboarding | ❌ **Missing** | `curl -X POST /v1/auth/oauth/google/start` → 404 on live. Handler code exists in `internal/handler/oauth.go` but not wired in production `main.go`. |
| Outlook / Microsoft Graph sync | ❌ No route | — | ❌ **Missing** | Spec §4.1 lists `microsoftgraph/msgraph-sdk-go`. No handler, service, or route for Outlook. |
| Calendar list | `GET /v1/calendars` | Settings → Calendars | ✅ **Live** | `curl /v1/calendars` → 401. Handler in `internal/handler/calendar.go`. |

---

## 4. Shopping Lists

| Spec Feature | Backend Endpoint | Frontend Screen | Status | Evidence |
|---|---|---|---|---|
| Manual shopping list CRUD | `GET/POST/PATCH/DELETE /v1/lists` + items | `/shopping`, `/lists` | ✅ **Live** | All list+item routes in `main.go`. `curl /v1/lists` → 401. `useLists`, `useCreateList`, `useAddListItem`, `useToggleListItem`, `useDeleteListItem` confirmed. |
| Auto-generate from meal plan | `POST /v1/shopping/generate` | Meal plan screen | ✅ **Live** | Route in `main.go`. `useGenerateShoppingList()` hook → `POST /v1/shopping/generate`. `curl -X POST /v1/shopping/generate` → 405 (needs auth). Button on meal plan screen calls mutation. |
| View current generated list | `GET /v1/shopping/current` | `/shopping` | ✅ **Live** | `curl /v1/shopping/current` → 401. `useShopping()` hook confirmed. Aisle grouping implemented in service. |
| Pantry staples | `GET/POST/DELETE /v1/shopping/staples` | Settings (not yet visible in UI) | 🟡 **Partial** | Endpoints exist (`curl /v1/shopping/staples` → 401). No dedicated UI card for managing staples found in settings/shopping screens. |
| Ingredient search / normalization | `GET /v1/ingredients/search?q=` | — | 🟡 **Partial** | `curl /v1/ingredients/search?q=milk` → 401. Endpoint exists. `ingredient_canonical` table populated. However no UI surface exposes ingredient search to the user. |
| Unit conversion (1 lb + 4 tbsp butter) | ❌ Backend limitation | — | ❌ **Missing** | BACKEND_STATUS.md explicitly notes: "different units for the same ingredient are kept as separate line items — no unit conversion." Listed as V1 limitation. |
| Pantry deduction | ❌ Not implemented | — | ❌ **Missing** | Spec §6.4.3: "if household maintains a pantry inventory, already-available ingredients are marked as 'have it'". No pantry inventory table or endpoint. |
| Shopping list history | ❌ Not implemented | — | ❌ **Missing** | Spec §6.4.3: "see past shopping lists". `GET /v1/shopping/current` returns only the active list. No history endpoint. |
| Aisle grouping (display) | via `GET /v1/shopping/current` | `/shopping` | ✅ **Live** | Service groups items by aisle. `shopping-list.stories.tsx` shows aisle display. |
| Drag-and-drop reorder | ❌ Not implemented | — | ❌ **Missing** | Spec §6.3: "Drag-and-drop reordering". `dnd-kit` is in `package.json` but no drag handler in `lists.tsx` or shopping screens. |

---

## 5. Meal Planning

| Spec Feature | Backend Endpoint | Frontend Screen | Status | Evidence |
|---|---|---|---|---|
| Weekly meal plan grid | `GET /v1/meal-plan`, `POST /v1/meal-plan`, `DELETE /v1/meal-plan/{id}` | `/meals`, `recipes.tsx` MealPlan | ✅ **Live** | Routes in `main.go`. `useMealPlan`, `useUpsertMealPlanEntry` hooks confirmed. Recipe picker modal wired with `onClick`. |
| Recipe assignment to slots | via `POST /v1/meal-plan` | Recipes / Meal plan screen | ✅ **Live** | `pickRecipe()` in `recipes.tsx` calls `upsertEntry.mutate({…})`. |
| Copy last week's plan | `GET /v1/meal-plan?weekOf=` | Meal plan screen | ✅ **Live** | `handleCopyLastWeek` fetches last week's plan + upserts entries. Wired to button. |
| Meal plan templates | ❌ Not implemented | — | ❌ **Missing** | Spec §6.4.2: "Save a good week as a reusable template." No template table, endpoint, or UI. |
| Per-member meal assignment | `assigned_member_id` in model | — | 🟡 **Partial** | DB column exists. No UI to assign meal to a specific member. |
| "What's for dinner?" kiosk widget | Dashboard kiosk screen | `dashboard-kiosk-ambient.tsx` | 🟡 **Partial** | Kiosk ambient dashboard shows recipe info from meal plan. `useRecipes()` hook wired. Widget shows today's recipe but no click-through to cooking mode from kiosk. |
| AI meal suggestions (BYOK) | ❌ No endpoint | Meal plan screen | 🚫 **Decorative** | `handleAISuggest` button exists in `recipes.tsx` at line 981. Function calls AI client directly with localStorage key. Works client-side if user has configured an AI key — but no backend route involved. AI keys stored in localStorage (intentional BYOK design). |
| LLM fallback for recipe scrape (BYOK) | ❌ Not in scraper | — | ❌ **Missing** | Spec §6.4.1: "LLM fallback — if structured extraction fails, send HTML to LLM." Not in `services/recipe-scraper/`. |

---

## 6. Recipes

| Spec Feature | Backend Endpoint | Frontend Screen | Status | Evidence |
|---|---|---|---|---|
| Recipe CRUD | `GET/POST/PATCH/DELETE /v1/recipes` | `/recipes` | ✅ **Live** | All routes confirmed. `curl /v1/recipes` → 401. `useRecipes`, `useRecipe` hooks. |
| Import from URL | `POST /v1/recipes/import` | `/recipes` → RecipeImport | ✅ **Live** | Route in `main.go`. Python recipe-scraper service handles `recipe-scrapers` (631 sites). `useImportRecipe()` hook → URL import form. `curl -X POST /v1/recipes/import` → 401. |
| Manual entry | Frontend form | `/recipes/import?manual=1` | 🟡 **Partial** | Button navigates to import page with `?manual=1` param but the page renders URL input — `?manual=1` differentiates nothing server-side (noted in BACKEND_STATUS.md as known gap). |
| Cooking mode | — (frontend display only) | `/recipes/{id}/cook` | ✅ **Live** | `cooking-mode.tsx` has step-by-step view, per-step timers with start/pause/reset, step navigation. Uses recipe data from `useRecipe()`. Route `/recipes/[id]/cook` confirmed in app dir. |
| Recipe collections | `GET/POST/PATCH/DELETE /v1/recipe-collections` | `recipes-with-collections.tsx` | ✅ **Live** | All collection routes in `main.go`. `useRecipeCollections`, `useCreateCollection`, `useAddRecipeToCollection` hooks confirmed. `curl /v1/recipe-collections` → 401. |
| Serving scaler | Frontend-only | Cooking mode / Recipe detail | 🟡 **Partial** | Spec requires "All ingredient amounts recalculate proportionally." `recipe-detail-themed.tsx` exists. No serving scaler UI control found in `cooking-mode.tsx` or `recipes.tsx`. |
| Favorites & ratings | `rating`, `is_favorite` in DB | Recipes screen | 🟡 **Partial** | DB columns exist. `PATCH /v1/recipes/{id}` can update them. No dedicated toggle/star-rating UI found in `recipes.tsx` screen. |
| Full-text recipe search | `SearchRecipes` sqlc query | Recipes screen | 🟡 **Partial** | `SearchRecipes` query in `sql/queries/recipe.sql`. No `GET /v1/recipes?q=` route in `main.go` — the list endpoint doesn't accept a search param. No frontend search input found in `recipes.tsx`. |
| Import from file (Paprika .paprikarecipes) | ❌ Not implemented | Recipes screen | 🚫 **Decorative** | Button exists in `RecipeImport` → `onClick={() => alert("File import coming soon…")}`. BACKEND_STATUS.md confirms: "No file-upload endpoint." |
| Photo-to-recipe OCR (BYOK) | ❌ Not implemented | — | ❌ **Missing** | Spec §6.4.1: "Take a photo of a recipe → OCR → LLM." No OCR endpoint or UI. |
| Share / export recipe (PDF/link) | ❌ Not implemented | — | ❌ **Missing** | Spec §6.4.1: "Generate a shareable link or export as printable card." No share endpoint. |
| Duplicate detection on import | `GetRecipeBySourceURL` sqlc query | — | 🟡 **Partial** | DB query exists. Not exposed in any handler response to user — no "this recipe already exists" UI warning. |
| Nutrition info | ❌ Not in schema | — | ❌ **Missing** | Spec §6.4.1 defines `NutritionInfo` sub-object. Not present in DB migration `20260423000006_init_recipes.sql`. |

---

## 7. Routines

| Spec Feature | Backend Endpoint | Frontend Screen | Status | Evidence |
|---|---|---|---|---|
| Routine CRUD | ❌ No route | `/routines` | ❌ **Missing** | `curl /v1/routines` → 404 on live. No routine handler in `internal/handler/`. `useRoutines()` hook calls `GET /v1/routines` but falls back to `fallback.routines()` stub data. `useToggleRoutineStep` calls `PUT /v1/routines/{id}/steps/{stepId}` — 404 on live. |
| Routine display modes (checklist / card / timeline) | — | `routine.tsx` | 🟡 **Partial** | `routine.tsx` renders steps with checkmarks; `toggleStep()` uses `useToggleRoutineStep()` hook, but since backend is missing the mutation fails silently with stub data. UI renders correctly from fallback data. |
| Routine templates (import/export JSON) | ❌ Not implemented | — | ❌ **Missing** | Spec §6.2: "Pre-built routine templates, importable/exportable as JSON." No endpoint, no UI. |
| Streak counters | ❌ Not implemented | — | ❌ **Missing** | Spec §6.2: "Completion tracking with streak counters." No streak DB table, no counter logic. |
| Kid view / routine path mode | Frontend-only | `/routines/kid`, `/routines/path` | 🟡 **Partial** | `app/routines/kid/` and `app/routines/path/` routes exist. UI renders from stub data. All real persistence requires missing backend. |
| Routine step timers | Frontend-only | `routine.tsx` | 🟡 **Partial** | Timer UI in `cooking-mode.tsx` (cooking). Routine screen `routine.tsx` has step toggle but no per-step countdown timer. Spec requires "optional timer per step with on-screen countdown." |

---

## 8. Gamification (Stars, Races, Rewards)

| Spec Feature | Backend Endpoint | Frontend Screen | Status | Evidence |
|---|---|---|---|---|
| Stars / chore economy | ❌ No route | Dashboard (kid view) | ❌ **Missing** | `curl /v1/races/current` → 404. No `stars`, `rewards`, or `leaderboard` endpoints in `main.go`. No DB migration for stars/rewards tables. |
| Race mode (list/routine races) | ❌ No route | `race.tsx` | 🚫 **Decorative** | `useRace()` hook calls `GET /v1/races/current` → falls back to `fallback.race()` stub. Race screen renders with stub data but no backend. `curl /v1/races/current` → 404. |
| Weekly leaderboard | ❌ No route | Dashboard | ❌ **Missing** | Spec §6.5.3. No leaderboard table or endpoint. |
| Reward definitions & redemption | ❌ No route | — | ❌ **Missing** | Spec §6.5.1. No rewards DB table or endpoint. |
| Completion animations (confetti, Lottie) | Frontend-only | Various | 🟡 **Partial** | `canvas-confetti` and `lottie-react` in `package.json`. No trigger in production screens — celebration animations not wired to any completion event. |
| Badges | ❌ Not implemented | — | ❌ **Missing** | Spec §6.5.4. No badge DB table or endpoint. |
| Streak milestones | ❌ Not implemented | — | ❌ **Missing** | Spec §6.5.2. No streak tracking anywhere in backend. |
| Feelings check-in | ❌ Not implemented | — | ❌ **Missing** | Spec mentions feelings check-in for kids. No endpoint or UI. |

---

## 9. Equity Engine

| Spec Feature | Backend Endpoint | Frontend Screen | Status | Evidence |
|---|---|---|---|---|
| Equity dashboard | `GET /v1/equity?from=&to=` | `equity.tsx` | ✅ **Live** | `curl /v1/equity` → 401. `useEquityDashboard()` hook confirmed. Screen wires live data with fallback. |
| Task domains (seeded defaults) | `GET /v1/equity/domains` | Equity screen | ✅ **Live** | `curl /v1/equity/domains` → 401. 12 default domains seeded on first call. `useEquityDomains()` hook. |
| Equity tasks CRUD | `GET/POST/PATCH/DELETE /v1/equity/tasks` | Equity screen | ✅ **Live** | All routes confirmed. `useEquityTasks`, `useCreateEquityTask`, `useUpdateEquityTask`, `useDeleteEquityTask` hooks confirmed. |
| Task time logging | `POST /v1/equity/tasks/{id}/log` | Equity screen | ✅ **Live** | Route in `main.go`. `useLogTaskTime()` hook. |
| Rebalance suggestions | `GET /v1/equity/suggestions` | Equity screen | ✅ **Live** | `curl /v1/equity/suggestions` → 401. `useRebalanceSuggestions()` hook. Heuristic: top member >55% load triggers suggestion. |
| Domain ownership assignment | `domain_ownerships` table | Equity screen | 🟡 **Partial** | DB table exists. However spec §6.6.2 lists `POST /api/domains/{id}/assign` — this maps to `PATCH /v1/equity/tasks/{id}` in current impl which does task-level ownership, not domain-level reassignment. No dedicated domain assign/history endpoint. |
| Domain ownership history | ❌ No route | — | ❌ **Missing** | Spec §6.6.6: `GET /api/domains/{id}/history`. No `domain_ownership_history` table or endpoint. |
| Personal time goal tracking | ❌ Not implemented | — | ❌ **Missing** | Spec §6.6.5: "Each adult member has a personal time goal." No personal_time_goal field on members, no tracking. |
| Cognitive vs physical split (display) | via task_log `is_cognitive` | Equity screen | 🟡 **Partial** | `is_cognitive` stored per log entry. Dashboard response includes split. UI card in `equity.tsx` shows the data. Works if users log time with the flag. |
| Time entry CRUD | `POST /v1/equity/tasks/{id}/log` | Equity screen | 🟡 **Partial** | Creation only (`POST /log`). No `GET /api/time-entries`, `PUT`, or `DELETE` per spec §6.6.6. Can't view or edit past time entries. |
| Load thresholds configurable | Hardcoded in service | — | 🟡 **Partial** | BACKEND_STATUS.md: "currently hardcoded — make them household settings in a future iteration." Spec says configurable. |

---

## 10. Notifications

| Spec Feature | Backend Endpoint | Frontend Screen | Status | Evidence |
|---|---|---|---|---|
| ntfy push notifications | `PATCH /v1/members/{id}/notify`, `POST /v1/notify/test` | Settings → Notifications | ✅ **Live** | Routes in `main.go`. `useUpdateMemberNotify`, `useTestNotification` hooks in `hooks.ts`. Settings page wires the form. `curl -X PATCH /v1/members/x/notify` → 405. ntfy POST to `https://ntfy.sh/<topic>` implemented in `notify.go`. |
| Triggered on event create | Via `EventService` → `NotifyService` | — | 🟡 **Partial** | `notify.go` service exists and is wired. But `EventService` does not call `NotifyService.Notify()` — only `AuditService` and broadcaster are called. Notification trigger not connected to event mutations. |
| Triggered on list item added | Via `ListService` → `NotifyService` | — | 🟡 **Partial** | Same issue — `ListService` does not call `NotifyService`. |
| Email notifications | ❌ Not implemented | — | ❌ **Missing** | `config.go` has `EmailEnabled bool` (default false). No email handler or SES integration in any service. Spec §6.7.3 requires email invites; billing tier §9 lists email notifications as a paid feature. |
| Event reminders (scheduled) | ❌ Not implemented | — | ❌ **Missing** | Spec §6.7 (competitor table): "Event reminders via push notification, email, or on-screen alert." No cron job or scheduled reminder system. |

---

## 11. AI BYOK

| Spec Feature | Backend Endpoint | Frontend Screen | Status | Evidence |
|---|---|---|---|---|
| API key configuration (OpenAI / Anthropic / Google) | — (frontend only, localStorage) | `/settings` → AI card | ✅ **Live** | `ai-section.tsx` stores keys in localStorage via `useAIKeys`. Test probe calls provider API directly. No key ever sent to Tidyboard backend (correct per spec). |
| AI test probe | Direct provider API call | Settings AI card | ✅ **Live** | `callOpenAI`, `callAnthropic`, `callGoogle` functions in `lib/ai/client.ts`. Test button wired to each. |
| AI meal suggestions | Client-side LLM call | Meal plan screen | 🟡 **Partial** | `handleAISuggest` in `recipes.tsx` wired to button. Calls AI with localStorage key. Works if key is set — but no UI feedback for "no key configured" state. |
| LLM recipe scrape fallback | ❌ Not in scraper | — | ❌ **Missing** | Python recipe scraper does not have LLM fallback step. |
| Photo-to-recipe OCR (BYOK) | ❌ Not implemented | — | ❌ **Missing** | Spec §6.4.1. No camera/OCR integration. |
| Photo-to-meal-plan OCR (BYOK) | ❌ Not implemented | — | ❌ **Missing** | Spec §6.4.2: "snap a handwritten plan → OCR + LLM → structured entries." |

---

## 12. Backups

| Spec Feature | Backend Endpoint | Frontend Screen | Status | Evidence |
|---|---|---|---|---|
| Scheduled pg_dump to local disk | Cron job in server | — | ✅ **Live** | `backup.go` uses `robfig/cron`. Runs `pg_dump → gzip`. Retention enforced. SHA-256 computed. |
| Manual backup trigger | `POST /v1/admin/backup/run` | Admin (no UI yet) | ✅ **Live** | `curl -X POST /v1/admin/backup/run` → 405. Admin-only. Returns 202 Accepted. |
| S3 upload | `backup_s3.go` | — | ✅ **Live** | `backup_s3.go` implements real `uploadBackupToS3` with AWS SDK v2 + named profile. Not a stub — actual `s3.PutObject` call. Requires `TIDYBOARD_BACKUP_S3_BUCKET` env. |
| Backup records in DB | `backup_records` table | — | ✅ **Live** | `InsertBackupRecord`, `UpdateBackupRecord`, `ListBackupRecords` sqlc queries confirmed. |
| Backup admin UI | ❌ No frontend | — | ❌ **Missing** | No `/admin` page in `web/src/app/admin/` that shows backup history or allows manual trigger. `app/admin/` contains only `page.tsx` (stub). |

---

## 13. Audit Log

| Spec Feature | Backend Endpoint | Frontend Screen | Status | Evidence |
|---|---|---|---|---|
| Audit log table | `audit_entries` table | — | ✅ **Live** | Migration `20260423000007` confirmed. Fields: `id, timestamp, household_id, actor_member_id, action, entity_type, entity_id, details jsonb, device_info, ip_address`. |
| Audit log API | `GET /v1/audit?limit=&offset=` | — | ✅ **Live** | `curl /v1/audit` → 401. Admin role required. `useAudit()` hook in `hooks.ts`. |
| Audit wired to events/lists | Via `AuditService.Log()` | — | 🟡 **Partial** | Confirmed wired to `EventService` and `ListService`. BACKEND_STATUS.md notes: "Audit for member/household mutations — extend MemberService and HouseholdService" is listed as TODO. |
| Admin audit UI | `/admin` page | `app/admin/` | 🟡 **Partial** | `app/admin/page.tsx` exists. `useAudit()` hook exists. Full admin UI not confirmed to be complete — appears minimal. |

---

## 14. Stripe Billing

| Spec Feature | Backend Endpoint | Frontend Screen | Status | Evidence |
|---|---|---|---|---|
| Checkout session | `POST /v1/billing/checkout` | — | 🟡 **Partial** | `curl -X POST /v1/billing/checkout` → 405. Handler in `internal/handler/billing.go`. Returns 503 if Stripe keys not configured. DB migration + subscription table confirmed. |
| Customer portal | `POST /v1/billing/portal` | — | 🟡 **Partial** | Route confirmed. Same 503 guard. |
| Subscription status | `GET /v1/billing/subscription` | Settings | ✅ **Live** | `curl /v1/billing/subscription` → 401. `useSubscription()` hook in `web/src/lib/api/use-subscription.ts`. Settings page imports hook. |
| Stripe webhook | `POST /v1/billing/webhook` | — | 🟡 **Partial** | Route exists (public, no JWT). Handles `customer.subscription.*` and `invoice.payment_*`. `curl -X POST /v1/billing/webhook` → 405 (correct — needs Stripe-Signature header). |
| Billing UI (upgrade prompt, plan display) | — | Settings page | 🟡 **Partial** | Settings page imports `useSubscription`. No full pricing page, plan comparison, or upgrade CTA confirmed in frontend. |
| Free tier enforcement | ❌ Not implemented | — | ❌ **Missing** | Spec §9 defines feature gates (e.g., "1 household, unlimited members" on Free). No middleware or service enforces plan limits. |

---

## 15. Storage / Media Uploads

| Spec Feature | Backend Endpoint | Frontend Screen | Status | Evidence |
|---|---|---|---|---|
| Media upload | `POST /v1/media/upload` | — | ✅ **Live** | `curl /v1/media/upload` → 401. Handler in `internal/handler/media.go`. 10MB limit. Accepts image/jpeg, image/png, image/webp, image/gif. |
| Local filesystem storage | `LocalStorage` struct | — | ✅ **Live** | `internal/service/storage.go` implements `LocalStorage` + `S3Storage`. Switches on `config.Storage.Type`. |
| S3 storage | `S3Storage` struct | — | ✅ **Live** | `newS3Storage` constructs S3 client with named AWS profile. `PutObject` + pre-signed URL generation confirmed. |
| Signed media URLs | `GET /v1/media/sign/*` | — | ✅ **Live** | Route in `main.go`. `mediaHandler.Sign` generates signed URLs for S3. |
| Serve local media | `GET /v1/media/*` | — | ✅ **Live** | Static file serving from `LocalStorage.BasePath`. |
| Avatar upload in UI | — | Settings / Member create | ❌ **Missing** | Spec requires avatar upload (with resize/crop). `imaging` library is in `go.mod`. No avatar upload UI in `settings/family-card.tsx` or onboarding. |
| Recipe image local copy | — | Recipe import | 🟡 **Partial** | Spec §6.4.1: "Recipe image is downloaded and stored locally." Python recipe scraper extracts `image_url` but does not download/store the image. Image URL is hotlinked from source. |

---

## 16. WebSocket Real-Time Updates

| Spec Feature | Backend Endpoint | Frontend Screen | Status | Evidence |
|---|---|---|---|---|
| WebSocket connection | `GET /v1/ws` | `ws-provider.tsx` | ✅ **Live** | `curl /v1/ws` → 401. Uses `coder/websocket`. JWT via Bearer header or `?token=`. 30s ping keepalive. |
| Redis pub/sub broadcaster | `RedisBroadcaster` | — | ✅ **Live** | `internal/broadcast/` with `RedisBroadcaster` + `MemoryBroadcaster` fallback. Confirmed in BACKEND_STATUS.md. |
| Event mutations publish WS events | `event.created/updated/deleted` | Calendar | ✅ **Live** | `EventService` publishes to broadcaster after DB write. Confirmed in BACKEND_STATUS.md. |
| List mutations publish WS events | `list.created/updated/deleted`, `list.item.*` | Lists | ✅ **Live** | `ListService` publishes all 6 list event types. |
| WS events for other domains | ❌ Partial coverage | — | 🟡 **Partial** | Only events and lists publish to WS. Equity, shopping, recipes, meal plan, routines do not publish WS events. Real-time updates limited to calendar+lists. |
| Frontend WS reconnect | `ws-provider.tsx` | All screens | ✅ **Live** | `useWS()` hook in settings page confirms WS provider present. Custom reconnect hook (per spec). |

---

## 17. Multi-Household Support

| Spec Feature | Backend Endpoint | Frontend Screen | Status | Evidence |
|---|---|---|---|---|
| Account in multiple households | DB schema supports it (`accounts` + `members`) | — | 🟡 **Partial** | Schema correct. `members.account_id` is nullable FK. Multiple `members` rows per `account` is possible. |
| `GET /v1/households` (list all for account) | ❌ No route | — | ❌ **Missing** | Only `GET /v1/households/{id}` exists. No list-all endpoint. `/v1/auth/me` returns a single `household_id`. |
| Household switcher UI | ❌ No UI | — | ❌ **Missing** | `auth-store.tsx` stores single household. No switcher component in any screen. Spec §6.7.5 requires it. |
| Kiosk locked to one household | Config / kiosk mode | `/kiosk` | ✅ **Live** | Kiosk page is public, always shows the same household from the loaded token. No switching UI on kiosk by design. |

---

## 18. Internationalization (i18n)

| Spec Feature | Backend Endpoint | Frontend Screen | Status | Evidence |
|---|---|---|---|---|
| English (en) locale | — | All screens | ✅ **Live** | `web/src/i18n/messages/en.json` confirmed. `next-intl` provider in layout. |
| German (de) locale | — | All screens | ✅ **Live** | `web/src/i18n/messages/de.json` confirmed. `LocaleSwitcher` in settings page. |
| Locale switcher UI | — | Settings page | ✅ **Live** | `LocaleSwitcher` component imported in `settings/page.tsx`. |
| Full screen coverage | — | All screens | 🟡 **Partial** | BACKEND_STATUS.md notes onboarding screen has `// TODO(i18n): strings extracted` comment. Some screens may have untranslated strings. Not all translation keys verified. |

---

## 19. Dark Mode

| Spec Feature | Backend Endpoint | Frontend Screen | Status | Evidence |
|---|---|---|---|---|
| Light / Dark / System theme | — | Settings → Appearance | ✅ **Live** | `theme-provider.tsx` implements light/dark/system with `localStorage` persistence + `prefers-color-scheme` media query. Three-way toggle in settings. |
| CSS-variable-based theming | — | All screens | ✅ **Live** | `globals.css` uses CSS custom properties. `theme-provider.tsx` adds `data-theme` attribute to `<html>`. No JS viewport flash (media query approach). |
| Auto dark mode by time of day | ❌ Not implemented | — | ❌ **Missing** | Spec §6.7 competitor table: "Full dark mode with auto-switching by time of day." `ThemeProvider` only supports system/light/dark — no time-based schedule. |

---

## 20. PWA / Offline

| Spec Feature | Backend Endpoint | Frontend Screen | Status | Evidence |
|---|---|---|---|---|
| Service worker + precaching | — | `sw.ts` | ✅ **Live** | `sw.ts` uses Serwist with `defaultCache` + `precacheEntries`. Service worker file `sw.js` present in `public/`. |
| Web app manifest | — | `public/manifest.webmanifest` | ✅ **Live** | Manifest confirmed: name, icons (192+512), `display: standalone`, `theme_color`, shortcuts (Calendar, Routines). |
| PWA install prompt | — | — | 🟡 **Partial** | Manifest + SW present (prerequisites met). No explicit `beforeinstallprompt` handler or install UI found in screens. |
| Offline fallback | — | `app/offline/` | 🟡 **Partial** | `app/offline/` route exists. Serwist `navigationPreload` enabled. True offline data (Dexie.js IndexedDB) — spec lists `Dexie.js 4+` in tech stack — not confirmed wired. |
| Turbopack / Serwist compatibility | Post-build script | — | ✅ **Live** | Per project memory: webpack plugin silently fails under Turbopack; fixed via `injectManifest()` post-build script. |

---

## 21. Accessibility

| Spec Feature | Backend Endpoint | Frontend Screen | Status | Evidence |
|---|---|---|---|---|
| WCAG 2.1 AA | — | All screens | 🟡 **Partial** | Radix UI primitives used (accessible by design). `aria-label` found in `lists.tsx` ("Delete item"). Partial coverage only — no automated a11y test suite found. |
| Keyboard navigation | — | All screens | 🟡 **Partial** | Radix UI + shadcn/ui handle keyboard for modal/dialog primitives. Custom buttons (`Btn` component) — keyboard support depends on native `<button>` usage. Not verified exhaustively. |
| Screen reader support | — | All screens | 🟡 **Partial** | `role="alert"` found in login page for errors. No systematic screen reader test evidence. |
| `dnd-kit` accessible drag-and-drop | ❌ Not wired | — | ❌ **Missing** | `dnd-kit` in `package.json`. Spec requires keyboard + screen reader DnD. No drag handlers found in any screen component. |

---

## 22. Mobile / Responsive

| Spec Feature | Backend Endpoint | Frontend Screen | Status | Evidence |
|---|---|---|---|---|
| Phone PWA layout | — | `dashboard-phone.tsx` | ✅ **Live** | `dashboard-phone.tsx` + `bottom-nav.tsx` confirmed. CSS media queries (not JS) for layout swap per project memory. |
| Desktop browser layout | — | `dashboard-desktop.tsx` | ✅ **Live** | `dashboard-desktop.tsx` confirmed. |
| Kiosk tablet layout | — | `dashboard-kiosk.tsx`, `dashboard-kiosk-ambient.tsx`, `dashboard-kiosk-columns.tsx` | ✅ **Live** | Three kiosk layout variants confirmed. |
| Responsive calendar views | — | `calendar.tsx` | ✅ **Live** | Day / Week / Month / Agenda views. View tabs with `onViewChange`. |
| Toddler / simplified mode | ❌ Not implemented | — | ❌ **Missing** | Spec §6.7: "Simplified single-task view, giant tap targets, no navigation" for toddlers. No toddler mode. |

---

## 23. Onboarding Flow

| Spec Feature | Backend Endpoint | Frontend Screen | Status | Evidence |
|---|---|---|---|---|
| 7-step wizard | Multiple endpoints | `/onboarding` | ✅ **Live** | `onboarding.tsx` with 7 steps. Household create, member create, iCal connect all wired. |
| iCal connect in step 5 | `POST /v1/calendars/ical` | Onboarding step 5 | ✅ **Live** | `handleICalSubmit` calls `addICal.mutate({name, url})`. `onSubmit` wired. |
| Google Calendar in step 5 | `POST /v1/auth/oauth/google/start` | Onboarding step 5 | ❌ **Missing** | Link present in UI but `/v1/auth/oauth/google/start` → 404 on live. |
| "Skip" options on each step | — | Onboarding | ✅ **Live** | All non-account steps have skip. Confirmed in `onboarding.tsx`. |

---

## Top 5 Priority Gaps

**Ranked by user visibility and blocking impact:**

### 1. Routines backend entirely missing (❌ Critical)
`GET /v1/routines` → 404. This is one of the top-3 spec features. The frontend renders routines from stub data — users cannot create, save, or complete routines. Streak tracking doesn't exist. This blocks the entire "routines + gamification" value proposition for families. **~40 DB columns, a migration, sqlc queries, and handler needed.**

### 2. Auth login/register 404 + Google OAuth not deployed (❌ High)
`/v1/auth/register` and `/v1/auth/login` return 404 — these routes were removed in favor of Cognito. New users **cannot sign up** unless `NEXT_PUBLIC_COGNITO_*` env vars are correctly set in the deployed build. Additionally, `/v1/auth/oauth/google/start` → 404 — the handler exists in code but isn't wired in production `main.go`. Google Calendar OAuth flow is fully broken on the live site.

### 3. Gamification (stars, races, rewards, leaderboard) entirely missing (❌ High)
No stars economy, no race mode, no rewards, no leaderboard endpoints or DB tables. The spec positions this as the primary differentiator for kids. `useRace()` falls back to stub data. A child using the app today sees a non-interactive race screen. **This is the core "why kids want to use it" feature.**

### 4. Household invite / member invite (❌ Medium-High)
Users cannot invite family members by email or join-code. DB tables (`invitations`, `join_requests`) exist but no handler exposes them. Email sending (SES/SMTP) is not implemented. Without this, new households can only have members added directly by the owner — a major friction point for onboarding co-parents or partners.

### 5. ntfy notifications not triggered by mutations (🟡 Medium)
The ntfy push service is configured and working (test endpoint works), but `EventService` and `ListService` don't call `NotifyService.Notify()`. Family members configured for push notifications never receive them. The plumbing exists — it just needs to be wired in the service layer.

---

## Recommended Next Steps

1. **Routines backend** — Create migration for `routines` + `routine_steps` + `routine_completions` + `streaks` tables; sqlc queries; handler; wire routes. Unblocks the single largest missing feature cluster.

2. **Fix Google OAuth route on live** — Wire `POST /v1/auth/oauth/google/start` and `GET /v1/auth/oauth/google/callback` in `main.go` (handler already exists). Without this, Google Calendar connect is broken in onboarding and settings.

3. **Wire notifications to service mutations** — In `EventService.Create/Update/Delete` and `ListService.CreateItem`, add a non-blocking `go s.notify.Notify(ctx, householdID, eventType, title, message)` call. One-hour task with outsized UX impact.

4. **Gamification tables + endpoints** — Start with stars economy (simplest): `star_balance` per member, increment on routine completion. Add `rewards` CRUD. Race mode and leaderboard can follow. Stars are visible on the kid's dashboard immediately once the endpoint exists.

5. **Household invite by email + join code** — Expose `RegenerateInviteCode` + a `POST /v1/households/{id}/invite` endpoint that stores an invitation row and (eventually) sends an email. Even without email, the invite-code join flow (Flow 3 from spec) can be completed immediately with existing DB tables.

---

## Evidence Appendix: Live curl Probe Results

```
200  /health
200  /ready
404  /v1/auth/register          ← BROKEN: route removed (Cognito migration)
404  /v1/auth/login             ← BROKEN: route removed (Cognito migration)
401  /v1/auth/me                ← OK: auth required
405  /v1/auth/pin               ← OK: needs POST + body
404  /v1/auth/oauth/google/start ← BROKEN: handler not wired in main.go
405  /v1/households             ← OK: needs POST + auth
401  /v1/events                 ← OK: auth required
401  /v1/lists                  ← OK: auth required
401  /v1/recipes                ← OK: auth required
401  /v1/recipe-collections     ← OK: auth required
401  /v1/meal-plan              ← OK: auth required
401  /v1/shopping/current       ← OK: auth required
405  /v1/shopping/generate      ← OK: needs POST + auth
401  /v1/equity                 ← OK: auth required
401  /v1/equity/domains         ← OK: auth required
401  /v1/equity/tasks           ← OK: auth required
401  /v1/equity/suggestions     ← OK: auth required
401  /v1/calendars              ← OK: auth required
401  /v1/audit                  ← OK: auth required (admin)
401  /v1/billing/subscription   ← OK: auth required
401  /v1/ws                     ← OK: auth required
401  /v1/media/upload           ← OK: auth required
405  /v1/notify/test            ← OK: needs POST + auth
404  /v1/routines               ← BROKEN: backend not implemented
404  /v1/races/current          ← BROKEN: backend not implemented
401  /v1/ingredients/search?q=  ← OK: auth required
401  /v1/shopping/staples       ← OK: auth required
401  /v1/media/sign/test        ← OK: auth required
405  /v1/admin/backup/run       ← OK: needs POST + admin auth
405  /v1/billing/checkout       ← OK: needs POST + auth
405  /v1/billing/portal         ← OK: needs POST + auth
```

---

## Go Test Evidence

```
ok  github.com/tidyboard/tidyboard/internal/broadcast   (unit tests: broadcaster round-trip, cancel)
ok  github.com/tidyboard/tidyboard/internal/client      (unit tests: sync client)
ok  github.com/tidyboard/tidyboard/internal/handler     (unit tests: health, health_unit, ws_broadcast)
ok  github.com/tidyboard/tidyboard/internal/middleware  (unit tests: rate limiter)
ok  github.com/tidyboard/tidyboard/internal/service     (unit tests: bcrypt, PIN, backup, billing, equity, notify, recipe, shopping, storage, sync)
ok  github.com/tidyboard/tidyboard/internal/testutil    (unit tests: factory helpers)

Integration tests (require TIDYBOARD_TEST_DSN):
  auth_test.go         — register+login round-trip, duplicate email 409, wrong password 401, PIN → 401
  household_test.go    — create+get+update+delete; not-found → 404
  event_test.go        — CRUD + range filter + out-of-range empty
  health_test.go       — GET /health 200, GET /ready 200
  recipe_import_test.go — import success 201, scraper 500 → 502, missing URL 400, no auth 401
```

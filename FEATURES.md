# FEATURES.md — feature × test-coverage catalog

**Source:** docs/specs/2026-05-01-flintstones-design.md, section C.

This file is the single source of truth for what tidyboard ships and how each
user-visible feature is covered by automated tests. Every autospec cycle that
adds, modifies, or removes a feature MUST update this catalog. Each row maps
a feature to:

- **Route(s):** the API path or UI route that exposes it
- **Unit:** Go unit tests (no DB) and frontend Vitest tests (no network)
- **Integration:** Go integration tests against real Postgres (`-tags=integration`)
- **E2E:dev:** Playwright local against `localhost:3000`
- **E2E:prod:** Playwright against `https://tidyboard.org` (the deploy gate)

Status legend: `OK` covered, `PART` partial, `NO` no coverage, `n/a` not applicable.

Coverage marks are conservative — when in doubt, mark `PART` rather than `OK`.
The Flintstones canonical fixture (Go: `internal/test/seed/flintstones.go`,
TS: `web/src/test/fixtures/flintstones.ts`) is the shared fixture for every
covered feature.

---

## 1. Auth & Onboarding

| Feature | Route(s) | Unit | Integration | E2E:dev | E2E:prod | Notes |
|---|---|---|---|---|---|---|
| Login (email/password) | POST /v1/auth/login | OK | OK | NO | PART | smoke; full flow gated on TEST_TOKEN |
| Cognito OIDC sign-in | POST /v1/auth/oidc/callback | PART | NO | NO | NO | manual rotation per spec H.2 |
| Logout | POST /v1/auth/logout | PART | NO | NO | NO | |
| Sign-up | POST /v1/auth/signup | PART | PART | NO | NO | invite-only flow |
| Onboarding wizard (household setup) | /onboarding | PART | NO | NO | NO | |
| Local-only auth + first-run owner setup | POST /v1/auth/local/setup, POST /v1/auth/local/login | OK | OK | NO | NO | issue #76; gated on Deployment.Mode=local; bcrypt password hash on accounts row |

## 2. Households & Members

| Feature | Route(s) | Unit | Integration | E2E:dev | E2E:prod | Notes |
|---|---|---|---|---|---|---|
| Create household | POST /v1/households | OK | OK | NO | NO | |
| Get household | GET /v1/households/:id | OK | OK | NO | NO | |
| List members | GET /v1/members | OK | OK | NO | PART | flintstones-flow:members |
| Create member | POST /v1/members | OK | OK | NO | NO | |
| Update member | PATCH /v1/members/:id | PART | OK | NO | NO | |
| Delete member | DELETE /v1/members/:id | PART | OK | NO | NO | |
| Invite by code | POST /v1/invites | PART | OK | NO | NO | |
| Hourly salary range (private) | PATCH /v1/members/:id (hourly_rate_cents_*) | OK | OK | NO | NO | backend #135 + UI #143 — privacy gated to self/admin in both layers |
| Roster color/avatar normalization (Cozyla hub foundation) | lib/roster (`normalizeRoster`, `memberColorFor`, `avatarFor`) | OK | n/a | NO | NO | issue #82 — shared contract for kiosk/calendar/tasks/meals/notes; pets are first-class but excluded from wallet/rewards |

## 3. Pets

| Feature | Route(s) | Unit | Integration | E2E:dev | E2E:prod | Notes |
|---|---|---|---|---|---|---|
| Pet member (read-only schema) | GET /v1/members | PART | OK | NO | PART | role='pet'; Dino in fixture |
| Pet edit/profile UI | n/a | NO | NO | NO | NO | feature not built; future cycle |
| Feeding tracker | n/a | NO | NO | NO | NO | feature not built; future cycle |
| Pet-chore linkage (replace-set) | GET/POST /v1/chores/:id/pets | OK | OK | NO | NO | backend #133; UI #141 — admin multi-select + kid-card pet badge |

## 4. Calendar & Events

| Feature | Route(s) | Unit | Integration | E2E:dev | E2E:prod | Notes |
|---|---|---|---|---|---|---|
| Create event | POST /v1/events | OK | OK | NO | NO | |
| List events in range | GET /v1/events | OK | OK | NO | NO | |
| Get event | GET /v1/events/:id | OK | OK | NO | NO | |
| Update event | PATCH /v1/events/:id | PART | OK | NO | NO | |
| Delete event | DELETE /v1/events/:id | PART | OK | NO | NO | |
| Assign members (assigned_members) | POST /v1/events | OK | OK | NO | NO | regression class — type-widening trap |
| Countdown event UI | /dashboard | PART | NO | NO | NO | DB column doesn't exist yet; UI-only |
| CalDAV sync | POST /v1/calendars | PART | PART | NO | NO | |
| EventCard primitive (TB tokens, agenda chrome reused) | components/calendar/EventCard | OK | n/a | NO | NO | issue #146; full + compact variants, used by agenda |
| Touch-first event detail sheet | components/calendar/EventDetailSheet | OK | n/a | NO | NO | issue #84; large tap targets, kiosk-readable, opens on event tap |
| Member filter chips (calendar) | components/calendar/MemberFilterChips | OK | n/a | NO | NO | issue #84; chip-toggle row filters Day/Week/Month/Agenda by member |

## 5. Recipes

| Feature | Route(s) | Unit | Integration | E2E:dev | E2E:prod | Notes |
|---|---|---|---|---|---|---|
| Create recipe | POST /v1/recipes | OK | OK | NO | NO | |
| List recipes | GET /v1/recipes | OK | OK | NO | NO | |
| Get recipe (with ingredients/steps) | GET /v1/recipes/:id | OK | OK | NO | NO | always-array fix #109 |
| Update recipe | PATCH /v1/recipes/:id | PART | OK | NO | NO | |
| Delete recipe | DELETE /v1/recipes/:id | PART | OK | NO | NO | |
| Recipe import (URL → recipe) | POST /v1/recipes/import | PART | PART | NO | NO | |
| Recipe collections | POST /v1/recipe-collections | PART | OK | NO | NO | |
| Favorite recipe | PATCH /v1/recipes/:id (is_favorite) | PART | OK | NO | NO | |
| Cooking-mode dark UI on TB tokens | /recipes/:id/cook | OK | n/a | NO | NO | issue #146; no hardcoded #fff/#000/rgba in cooking-mode |

## 6. Meal Plans

| Feature | Route(s) | Unit | Integration | E2E:dev | E2E:prod | Notes |
|---|---|---|---|---|---|---|
| Upsert meal-plan entry | POST /v1/meal-plan | OK | OK | NO | NO | |
| List meal-plan range | GET /v1/meal-plan | OK | OK | NO | NO | |
| Delete meal-plan entry | DELETE /v1/meal-plan/:id | PART | OK | NO | NO | |
| Serving multiplier | POST /v1/meal-plan (serving_multiplier) | OK | OK | NO | NO | regression class #113 |

## 7. Shopping & Pantry

| Feature | Route(s) | Unit | Integration | E2E:dev | E2E:prod | Notes |
|---|---|---|---|---|---|---|
| Generate shopping list | POST /v1/shopping/generate | OK | OK | NO | NO | from meal plan |
| List items | GET /v1/shopping/lists/:id/items | OK | OK | NO | NO | |
| Insert item | POST /v1/shopping/lists/:id/items | OK | OK | NO | NO | |
| Toggle item completed | PATCH /v1/shopping/items/:id | OK | OK | NO | NO | |
| Pantry staples (auto-append) | GET /v1/pantry, POST /v1/pantry | OK | OK | NO | NO | |

## 8. Chores & Wallet

| Feature | Route(s) | Unit | Integration | E2E:dev | E2E:prod | Notes |
|---|---|---|---|---|---|---|
| Create chore | POST /v1/chores | OK | OK | NO | NO | |
| List chores | GET /v1/chores | OK | OK | NO | NO | |
| Complete chore (auto-approve) | POST /v1/chores/:id/complete | OK | OK | NO | NO | |
| Chore wallet balance | GET /v1/wallet/:memberId | OK | OK | NO | NO | |
| Wallet transactions | GET /v1/wallet/:memberId/transactions | OK | OK | NO | NO | |
| Allowance | GET/POST /v1/allowance | PART | OK | NO | NO | |
| Ad-hoc tasks | POST /v1/ad-hoc-tasks | PART | OK | NO | NO | |
| Chore time tracking (start/stop) | POST /v1/chores/:id/timer/*, POST /v1/chores/:id/time-entries, GET /v1/members/:id/time-summary | OK | OK | NO | NO | backend shipped via #134; kid timer button + admin time-review UI shipped via #142 |
| Equity contribution aggregate | GET /v1/equity/contribution | OK | OK | NO | NO | issue #138 (backend) + issue #144 (web) — aggregates task_logs + chore_time_entries; honors hourly_rate privacy; surfaced in equity Contribution tab. |
| Chore→wallet payout (audit & fix) | POST /v1/chores/:id/complete | OK | PART | NO | NO | backend #137 inserts wallet_transactions; UI #145 — `useMarkChoreComplete` invalidates `["wallet"]` so chores-kid balance refetches on completion (covered by chores-kid.test.tsx) |
| Housekeeper-cost estimate (per category) | GET /v1/equity/housekeeper-estimate | OK | OK | NO | NO | issue #139 (backend) + issue #144 (web) — go:embed rate asset, sums chore_time_entries × category market rate; surfaced in equity Contribution tab via `<HousekeeperCard/>`. |

## 9. Points & Rewards

> Wallet/payout correctness audit is in flight as cycle 3 issue #137; tracked in section 8.

| Feature | Route(s) | Unit | Integration | E2E:dev | E2E:prod | Notes |
|---|---|---|---|---|---|---|
| Point categories | GET/POST /v1/points/categories | PART | PART | NO | NO | |
| Behaviors | GET/POST /v1/points/behaviors | PART | PART | NO | NO | |
| Grant points | POST /v1/points/grants | PART | PART | NO | NO | |
| Scoreboard | GET /v1/points/scoreboard | PART | PART | NO | NO | |
| Rewards catalog | GET/POST /v1/rewards | PART | PART | NO | NO | |
| Redeem reward | POST /v1/rewards/:id/redeem | PART | PART | NO | NO | |
| Savings goals | POST /v1/savings-goals | PART | PART | NO | NO | |

## 10. Routines

| Feature | Route(s) | Unit | Integration | E2E:dev | E2E:prod | Notes |
|---|---|---|---|---|---|---|
| Create routine | POST /v1/routines | OK | OK | NO | NO | |
| List routines | GET /v1/routines | OK | OK | NO | NO | |
| Add step | POST /v1/routines/:id/steps | OK | OK | NO | NO | |
| Mark step complete | POST /v1/routines/:id/completions | OK | OK | NO | NO | |
| Daily-completion counts | GET /v1/routines/:id/stats | PART | PART | NO | NO | |

## 11. Kiosk & Dashboards

| Feature | Route(s) | Unit | Integration | E2E:dev | E2E:prod | Notes |
|---|---|---|---|---|---|---|
| Kiosk dashboard | / (kiosk mode) | PART | n/a | NO | PART | reads events + chores + routines |
| Per-member dashboard | /member/:id | PART | n/a | NO | NO | |
| Countdown widget (UI) | /dashboard | OK | n/a | NO | NO | shipped 2026-04-30 |
| PageShell layout primitive (header/main/footer slots) | components/layout/page-shell | OK | n/a | NO | NO | issue #147; TB-tokenized, used by dash-phone + dash-kiosk-ambient + equity |
| Dashboard/Equity TB-token refactor | dashboard-kiosk-ambient, dashboard-phone, equity | OK | n/a | NO | NO | issue #147; inline-style colors/spacing replaced with TB tokens |
| Widget data contract (`WidgetState<T>`, `useWidgetState`) | lib/widgets | OK | n/a | NO | NO | issue #82 — explicit loading/empty/error/ready states; bans demo-data fallbacks on production routes |
| Roster hook (`useRoster`) — real household roster | lib/roster | OK | n/a | NO | NO | issue #82 — pulls people + pets, normalized colors/avatars for kiosk widgets |
| Unified task feed (todos+routines+chores+rewards+approvals) | components/tasks/UnifiedTaskFeed (`unifyTasks`) | OK | n/a | NO | NO | issue #85 — projects each source to a common `UnifiedTask` shape, member chip filter narrows the list; pets excluded from wallet/reward sources |
| Fixed kiosk pages (Cozyla-style) | /kiosk/today, /kiosk/week, /kiosk/meals, /kiosk/tasks | OK | n/a | NO | NO | issue #83 — Today/Week/Meals/Tasks templated full-screen pages with shared widgets; touch-friendly tab bar; 1920x1080 + responsive |
| Kiosk widget library (templated) | components/kiosk/widgets/* | OK | n/a | NO | NO | issue #83 — ClockWeatherWidget, NextEventWidget, AgendaListWidget, WeekCalendarWidget, MealStripWidget, ShoppingWidget, ChoreBoardWidget, RewardsWidget — consume `WidgetMember` projection |

## 12. Errors & Observability

| Feature | Route(s) | Unit | Integration | E2E:dev | E2E:prod | Notes |
|---|---|---|---|---|---|---|
| Request-ID middleware | (all) | OK | OK | NO | NO | |
| Audit log | GET /v1/audit | OK | OK | NO | NO | |
| ErrorAlert UI | (cross-cutting) | OK | n/a | NO | NO | "Copy details" + "Report to GitHub" buttons (#140) |
| Metrics endpoint | /metrics | OK | n/a | NO | PART | smoke |
| Health endpoint | /healthz | OK | OK | NO | OK | |
| GitHub bug-report (from ErrorAlert) | POST /v1/bug-reports | OK | OK | NO | NO | backend #136 + UI #140 (Report-to-GitHub button on `<ErrorAlert/>`, `useReportBug()` hook) |

## 13. Sync & Backup

| Feature | Route(s) | Unit | Integration | E2E:dev | E2E:prod | Notes |
|---|---|---|---|---|---|---|
| WebSocket sync | WS /v1/sync | PART | PART | NO | NO | |
| S3 backup (write) | POST /v1/backup | PART | PART | NO | NO | |
| S3 backup (restore) | POST /v1/restore | NO | NO | NO | NO | |
| Backup record listing | GET /v1/backups | OK | OK | NO | NO | |

## 14. Settings & Devices

| Feature | Route(s) | Unit | Integration | E2E:dev | E2E:prod | Notes |
|---|---|---|---|---|---|---|
| Household settings | GET/PATCH /v1/households/:id/settings | PART | PART | NO | NO | |
| Member notification preferences | PATCH /v1/members/:id (notification_preferences) | PART | OK | NO | NO | |
| ntfy topic per member | PATCH /v1/members/:id (ntfy_topic) | PART | OK | NO | NO | |
| Device pairing (kiosk) | POST /v1/devices/pair | NO | NO | NO | NO | future cycle |
| Subscriptions (Stripe) | POST /v1/subscriptions | PART | PART | NO | NO | |

## 15. Deployment Profiles

| Feature | Route(s) | Unit | Integration | E2E:dev | E2E:prod | Notes |
|---|---|---|---|---|---|---|
| Deployment mode (cloud / local) | n/a (server startup) | OK | n/a | NO | NO | issue #75 — `TIDYBOARD_DEPLOYMENT_MODE` selects cloud vs local profile and validates settings on startup |
| Local production profile | n/a (server startup) | OK | n/a | NO | NO | issue #75 — local mode rejects Cognito/S3/Stripe/cloud AI configuration; foundation for #76 #77 #78 |
| Ollama provider for local mode (local + remote LAN) | n/a (server startup, AI client) | OK | n/a | NO | NO | issue #78 — `internal/ai` Ollama HTTP client; `cfg.AI.Provider`, `cfg.AI.OllamaHost`, `cfg.AI.OllamaModel`; provider switches to Ollama in local mode and stays disabled by default in cloud mode; reachability check exposed via client |
| Local docker-compose stack | n/a (deployment) | OK | n/a | NO | NO | issue #77 — `docker-compose.local.yml` overlay with local Postgres + Redis volumes, local file storage, no S3, no Cognito; validated via `make compose-local-validate` |
| Local backup/restore/upgrade | n/a (operator) | OK | PART | NO | NO | issue #79 — `make backup-local` pg_dumps DB + tars media volume into the `tidyboard-backups` volume; `make restore-local FROM=<file>` reverses it; README documents upgrade flow (pull → migrate → up). Unit-tested via `internal/service/backup_local_test.go`; integration runs against the docker-compose stack. |

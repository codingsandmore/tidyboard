# Design: Bug-Report, Wallet/Points, Fairplay Equity, Time Tracking, Salary Ranges, Design Consistency

**Date:** 2026-05-01
**Author:** autospec (codingsandmore/tidyboard)
**Status:** Approved (auto-mode; user authorized "no data risk, run anything")
**Depends on:** PR for `autospec/flintstones-2026-05-01` foundation (must merge first — adds seed UUIDs and FEATURES.md scaffold)

## Overview

Six related capabilities, in priority order:

1. **A. GitHub bug-report from `<ErrorAlert/>`.** When an error is shown, give the user a button that files a GitHub issue carrying URL, request_id, status code, message, stack, user agent. Backend proxies the GitHub API call so the frontend never sees the PAT.
2. **B. Design consistency refactor.** Replace ad-hoc inline `style={{}}` blocks with `TB.*` tokens on the 5 worst offenders (cooking-mode.tsx, calendar.tsx, dashboard-kiosk-ambient.tsx, dashboard-phone.tsx, equity.tsx). Extract shared chrome where duplicated.
3. **C. Wallet + points correctness.** Audit and fix: kid earns points → wallet credit → reward redemption flow. Verify Pebbles can complete "Feed Dino", earn stones, redeem "Extra TV Time".
4. **D. Pet-chore linkage.** Chores can target one or more pets. New `chore_pets` join table. UI lets admin assign pets to a chore.
5. **E. Adult chores + fairplay equity.** Mom/dad chores feed the existing equity calculator. Confirm `equity_tasks` + `task_logs` infrastructure works end-to-end. Add a contribution-percentage view.
6. **F. Time tracking on chores.** Kids and adults can mark task start/end. Telemetry stored in new `chore_time_entries` table mirroring the equity `task_logs` shape. Admin can review aggregate time per member.
7. **G. Hourly salary ranges + financial valuation.** Each adult member sets a personal hourly rate (private — visible only to self + household admin). Contributions valued in dollars by `hours × rate`.
8. **H. Housekeeper cost helper.** Equity dashboard shows: "Wilma spent N hours on cooking last week. At her rate that's $X. Hiring out comparable service costs ~$Y." Reference data: hard-coded rough market rates per chore type.

Phase 1 audit findings (from `Phase 1 investigation` subagent on 2026-05-01):

- Chore handler exists; completions tracked in `chore_completions` table — no `started_at`/`ended_at`/`duration` columns yet.
- Wallet (`wallets`, `wallet_transactions`) and points (`point_categories`, `behaviors`, `point_grants`, `rewards`, `redemptions`) exist as **separate** subsystems (no integration with chores currently — only via service layer).
- Equity calculator EXISTS (`internal/handler/equity.go`, `equity_tasks`, `task_logs`). `task_logs` already has `started_at`, `duration_minutes`, `is_cognitive`, `source` columns. **Time tracking is solved for adult equity tasks; it needs to be applied to kid chores too.**
- Members table has NO `hourly_rate` field today.
- Pets are schema + onboarding only (no edit, profile, feed UI; no chore linkage).
- Design hotspots: `cooking-mode.tsx` (30 inline style blocks, hardcoded `#000`/`#fff`), `calendar.tsx` (94 inline styles), `dashboard-kiosk-ambient.tsx`, `dashboard-phone.tsx`, `equity.tsx`.
- `<ErrorAlert/>` exists post-#127, has Copy-details button. No GitHub-issue button. Backend has zero GitHub API integration.
- Storybook exists with 35 stories; new components must add stories.
- `audit_entries` exists but is underutilized — chore handler doesn't call `audit.Log()`. Time-tracking is a good use of this infrastructure.

## A. GitHub bug-report flow

### A.1 Frontend
- Add a "Report to GitHub" button next to the existing "Copy details" in `<ErrorAlert/>`.
- Click → POST `/v1/bug-reports` with the error JSON + current URL + user agent + active-member name.
- Show toast "Reported as #N" on success, or fall back to opening a pre-filled `https://github.com/codingsandmore/tidyboard/issues/new?...` in a new tab on failure.
- Rate-limit: client-side, one button click ≤ 1/min per session.

### A.2 Backend
- New endpoint: `POST /v1/bug-reports`. Auth required.
- Body: `{ url, requestId, code, message, stack?, userAgent, status, method }`.
- Service: builds the GitHub issue title (`[App bug] <code> at <url>`) and body (markdown, fenced stack). Calls GitHub API via `github.com/google/go-github/v66/github` package using a repo-scoped PAT loaded from env `GITHUB_BUG_REPORT_TOKEN`.
- Server-side rate-limit: 1 request/min per member ID (in-memory token bucket).
- Returns `{ issue_number, issue_url }`.
- Audit: `audit.Log(ctx, "bug_report.filed", { issue_number, url })`.

### A.3 Token + secret
- One-time op: user generates a fine-scoped PAT with `repo: issues: write` permission, sets `GITHUB_BUG_REPORT_TOKEN` env on the EC2 box's docker-compose `.env`.
- Documented in operational runbook.
- No PAT visible in code.

## B. Design consistency refactor

### B.1 Targeted files (5 worst offenders + 1 layout extraction)
1. `web/src/components/screens/cooking-mode.tsx` — replace 30 inline styles with TB tokens. Dark mode handled via `TB.bg` (variable per theme), not hardcoded `#000`.
2. `web/src/components/screens/calendar.tsx` — replace 94 inline styles. Extract repeated event-card chrome into `<EventCard/>`.
3. `web/src/components/screens/dashboard-kiosk-ambient.tsx` — TB tokens, extract member-tile chrome.
4. `web/src/components/screens/dashboard-phone.tsx` — TB tokens.
5. `web/src/components/screens/equity.tsx` — TB tokens for the chart colors.
6. **New** `web/src/components/layout/PageShell.tsx` — header + main + footer chrome shared across all screens. Each refactored screen uses it.

### B.2 Storybook
Every new or refactored component gets a story. Existing 35 stories stay green.

### B.3 Lint rule (optional, document only — out of scope of this cycle)
A future cycle could add an ESLint rule banning `style={{` on string literals containing `#`. Documented for follow-up.

## C. Wallet + points correctness

### C.1 Audit existing flow
- Confirm POST `/v1/chores/{id}/complete` → `chore_completions` row → wallet credit (chore.weight × value)? Or is wallet a manual adjustment only?
- Confirm POST `/v1/points/grants` → `point_grants` → cumulative balance via aggregate?
- Confirm POST `/v1/redemptions` deducts points and records redemption.

### C.2 Fix path (one or more issues, scope per finding)
- If chore → wallet is broken: wire `chore.MarkComplete` to insert a `wallet_transactions` row (kind='chore_payout') with amount = chore.weight × household payout rate.
- If points-from-chores is desired (TBD per behavior table): the spec keeps points/wallet separate; a chore yields stones (wallet) by default. Behaviors can still grant points independently.
- If redemption flow is broken: add tests; fix.

### C.3 Tests
- `internal/service/chore_payout_test.go` — happy path: complete chore → wallet balance increases by expected amount; idempotent (same date completed twice → one transaction).
- `web/src/components/screens/chores-kid.test.tsx` — completing a chore in UI calls the mutation that triggers the payout.

### C.4 Foundation seed extension
- Foundation's "Feed Dino" chore weight = 2; payout rate = 5 stones/weight = 10 stones per completion. Seed has Pebbles already at 50 stones; if we test by completing the chore once, balance = 60.

## D. Pet-chore linkage

### D.1 Schema
New migration `20260501000010_chore_pets.sql`:

```sql
CREATE TABLE chore_pets (
    chore_id   UUID NOT NULL REFERENCES chores(id) ON DELETE CASCADE,
    pet_member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    PRIMARY KEY (chore_id, pet_member_id)
);
CREATE INDEX idx_chore_pets_pet ON chore_pets(pet_member_id);
```

Constraint via trigger or app-level check: `pet_member_id` must reference a member with `role='pet'`.

### D.2 API
- `POST /v1/chores/{id}/pets` — set the pet list (idempotent replace).
- `GET /v1/chores/{id}` — response includes `pet_member_ids: []uuid`.

### D.3 UI
- Chore admin form: multi-select of pets in the household (similar to `<MemberMultiSelect/>` from #112).
- Kid chore card displays pet emoji/avatar inline ("🐶 Feed Dino — 5 stones").

### D.4 Seed extension
- "Feed Dino" chore links to `Dino.id`. Foundation shipped without this; this issue adds the link.

## E. Adult chores + fairplay equity

### E.1 Audit existing
The equity calculator is built. Just needs:
- Foundation seed gains 4-5 representative `equity_tasks` per household (cooking, dishes, laundry, mental load).
- A `task_log` aggregate query that returns `{ member_id, total_minutes, total_dollars, percentage }` over a date range.

### E.2 New endpoint
`GET /v1/equity/contribution?household_id=&from=&to=` returns per-member aggregate. Powers the contribution dashboard.

### E.3 UI
- Refactored `equity.tsx` (B.5) gets a "Contribution" tab with bars: hours per member, percentage of total, dollar valuation (per G).
- Suggests rebalancing if any adult is >70% of household contribution.

## F. Time tracking on tasks/chores

### F.1 Schema (mirror task_logs for chore_completions)

New migration `20260501000020_chore_time_entries.sql`:

```sql
CREATE TABLE chore_time_entries (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chore_id      UUID NOT NULL REFERENCES chores(id) ON DELETE CASCADE,
    completion_id UUID REFERENCES chore_completions(id) ON DELETE SET NULL,
    member_id     UUID NOT NULL REFERENCES members(id),
    started_at    TIMESTAMPTZ NOT NULL,
    ended_at      TIMESTAMPTZ,
    duration_seconds INTEGER GENERATED ALWAYS AS (
      CASE WHEN ended_at IS NULL THEN NULL ELSE EXTRACT(EPOCH FROM (ended_at - started_at))::INTEGER END
    ) STORED,
    source        TEXT NOT NULL DEFAULT 'timer' CHECK (source IN ('timer','manual','auto_estimate')),
    notes         TEXT
);
CREATE INDEX idx_chore_time_member ON chore_time_entries(member_id);
CREATE INDEX idx_chore_time_chore ON chore_time_entries(chore_id);
```

### F.2 API
- `POST /v1/chores/{id}/timer/start` — opens an entry with `started_at = now()`, `member_id` from auth.
- `POST /v1/chores/{id}/timer/stop` — closes the latest open entry for this member with `ended_at = now()`.
- `POST /v1/chores/{id}/time-entries` — manual entry with full payload.
- `GET /v1/members/{id}/time-summary?from=&to=` — aggregates.

### F.3 UI
- Big start/stop button on the kid chore card. When stopped, shows duration and confirms "Mark complete?".
- Adult chore screen shows similar timer.
- Admin time review screen lists entries for review/edit.

### F.4 Tests
- Service: start → stop computes duration correctly; no overlapping open entries.
- Handler integration: full cycle round-trip.

## G. Hourly salary ranges + financial valuation

### G.1 Schema
Migration `20260501000030_member_hourly_rate.sql`:

```sql
ALTER TABLE members
  ADD COLUMN hourly_rate_cents_min INTEGER,
  ADD COLUMN hourly_rate_cents_max INTEGER,
  ADD CONSTRAINT chk_hourly_range
    CHECK (hourly_rate_cents_min IS NULL OR hourly_rate_cents_max IS NULL OR hourly_rate_cents_min <= hourly_rate_cents_max);
```

Fields are nullable (default unset).

### G.2 API
- `PATCH /v1/members/{id}` accepts `hourly_rate_cents_min`/`max`. Authorization: only the member themselves or a household admin.
- `GET /v1/members/{id}` returns the rate to authorized callers; for unauthorized callers (kids, other members) the rate is omitted.

### G.3 Privacy
Rates are confidential within the household: kids never see their parents' rates. The UI explicitly hides them in member-list contexts unless the viewer is the rate-owner or admin.

### G.4 Calculation
A task log's dollar value = `duration_seconds × rate_per_second`. When a range is set, both endpoints are computed and the UI shows a min-max band. When unset, dollar value is omitted from the contribution view.

### G.5 UI
- Member settings screen has the rate field (admins can edit any member; non-admin members can only edit their own).
- Equity dashboard shows dollar valuation alongside hours where rates exist.

## H. Housekeeper cost helper

### H.1 Reference rates
A small in-repo JSON file `web/public/housekeeper-rates.json`:

```json
{
  "cooking_meal": {"market_rate_cents_per_hour": 3000, "comment": "personal chef"},
  "deep_clean":   {"market_rate_cents_per_hour": 4500, "comment": "deep cleaning service"},
  "laundry":      {"market_rate_cents_per_load_cents": 1500},
  "child_care":   {"market_rate_cents_per_hour": 2500}
}
```

Tasks/chores carry an optional `category` field. The dashboard sums `hours × market_rate` per category.

### H.2 UI
Card on the equity dashboard: "If you hired out cooking last week, it would have cost ~$X. Wilma actually spent N hours; her implied savings vs. hire = $X − (N × her_rate)."

### H.3 Out of scope
Actual booking integrations, recommended providers — those are commerce features for later cycles.

---

## Cross-cutting conventions

- TDD non-negotiable; real DB no mocks.
- Conventional commits.
- Branch-per-issue: `feat/bug-report-github`, `feat/chore-pets-linkage`, `refactor/design-cooking-mode`, etc.
- Auto-merge per AGENTS.md when CI green + LGTM.
- Every PR MUST update `FEATURES.md` for any user-visible feature change (per the foundation's AGENTS.md rule).
- Member.role enum is `"adult" | "child" | "pet"`, never `"kid"`.
- Privacy: hourly_rate fields are restricted to self + admin; never logged.

## Operational items (cannot be autospec'd)

- Generate `GITHUB_BUG_REPORT_TOKEN` (fine-scoped PAT, repo:issues:write only).
- Add the token to EC2 box's docker-compose `.env` and to GH repo secret if e2e tests need to flex the bug-report path.
- One-time prod migration: deploy ships migrations automatically; no manual step.

## Implementation order (dependency edges)

```
PRE: foundation PR autospec/flintstones-2026-05-01 must merge first.

Foundation extensions (all depend on foundation merge):
  D-schema  chore_pets table + sqlc + service + handler
  F-schema  chore_time_entries table + sqlc + service + timer endpoints
  G-schema  members.hourly_rate_cents_min/max migration + API gating

Backend services (depend on schemas):
  A-backend POST /v1/bug-reports + GitHub client + rate limit
  C-fix     wallet+points correctness audit and fix
  E-aggregate GET /v1/equity/contribution
  H-rates   housekeeper-rates.json + dashboard math

Frontend (depend on backend):
  A-ui      ErrorAlert "Report to GitHub" button + toast
  D-ui      pet multi-select on chore admin form
  F-ui      timer start/stop on chore card; admin review
  G-ui      hourly rate field on member settings
  E-ui+H-ui equity contribution tab + housekeeper cost card
  C-ui      chore-kid screen reflects wallet correctly
  B         design consistency refactor (5 files + PageShell)

Cross-cutting:
  AGENTS.md update describing the new privacy + audit rules
  FEATURES.md updates per-PR
```

Total: 1 epic + roughly 16 children.

## Test gates per child

A child is "done" when:
1. `go build ./... && go vet ./...` green.
2. `go test -tags=integration ./internal/...` green.
3. `cd web && npm test` green (relevant pattern).
4. Primary smoke (per issue) passes.
5. Self-review LGTM.
6. CI green.
7. **`FEATURES.md` updated** for any user-visible feature change.
8. (For bug-report PR) e2e test confirms a real GH issue gets filed against a sandbox repo (not codingsandmore/tidyboard during tests).

## AGENTS.md additions

Append:

> **Hourly rate privacy.** `members.hourly_rate_cents_min`/`max` are private. Handlers MUST gate read access to (a) the rate-owner themselves, or (b) a household admin (role='owner' or 'admin'). Never log these values. Never include them in audit-log details.
>
> **Bug-report token.** `GITHUB_BUG_REPORT_TOKEN` env is required for the bug-report endpoint; the endpoint returns 503 with a clear message if the token is missing. The token is a fine-scoped PAT (`repo:issues:write` only). Do NOT log the token; do NOT include it in error envelopes.
>
> **Time-tracking semantic.** A member can have at most ONE open `chore_time_entries` row per chore at a time. Attempting to start a second open entry returns 409 with `code:"timer_already_running"`. Stopping an entry sets `ended_at = now()` server-side; the client doesn't propose the value.

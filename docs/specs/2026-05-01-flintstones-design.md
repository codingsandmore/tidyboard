# Design: Flintstones Test Family Infrastructure

**Date:** 2026-05-01
**Author:** autospec (codingsandmore/tidyboard)
**Status:** Approved (auto-mode, low-risk because no production data exists yet)

## Overview

Three goals, in priority order:

1. **Catch type-widening regressions at PR-CI time.** The autospec cycle that just shipped widened `TBDEvent` with optional `assigned_members`; five dashboard call sites still read `event.members` and crashed prod on first login. Existing Vitest fixtures populated `members` directly — they did not mirror the live API shape. Fixtures must henceforth be a faithful mirror of the server.
2. **Comprehensive feature coverage end-to-end against the live deployment.** Every user-visible feature has at least one Playwright `e2e:prod` assertion that runs against `https://tidyboard.org`. New features must add a row to a `FEATURES.md` catalog AND extend the e2e flow.
3. **Hard-fail deploy gate.** A failing post-deploy `e2e:prod` run hard-fails the deploy job, preventing further pushes from reaching prod until the regression is fixed.

The vehicle is a canonical seeded test family — the Flintstones (primary) and the Rubbles (cross-household isolation) — used by every layer: Vitest fixtures, Go integration tests, Playwright local, and Playwright prod.

Phase 1 audit findings:

- **No canonical household fixture exists today.** All component tests use hand-stubbed object literals.
- **Existing Vitest fixtures populate `members` only — never `assigned_members`.** Confirms the regression class.
- `e2e-prod` harness already exists with `public.spec.ts` (unauth smoke) and `family-flow.spec.ts` (token-gated). Tests run against `https://tidyboard.org` with `TIDYBOARD_TEST_TOKEN` Bearer JWT.
- **Pets are schema + onboarding-only.** No edit/delete/profile UI, no feeding tracker, no pet-specific endpoints. `members.role = 'pet'` is the entire feature surface.
- Auth is Cognito JWT in prod; no long-lived service-token endpoint exists.
- `deploy-ec2.yml` runs `on: workflow_run: [CI]` and skips when CI fails (the silent-skip-since-the-migration-collision pattern from the last cycle).
- AGENTS.md is on `main` as of PR #104.

## A. Canonical seed data

### A.1 The Flintstones (primary test household)

| Member | Role | Email | Auth | Notes |
|---|---|---|---|---|
| Fred Flintstone | adult | fred@bedrock.test | Cognito (test pool) | Lead. Token holder for `TIDYBOARD_TEST_TOKEN`. |
| Wilma Flintstone | adult | wilma@bedrock.test | Cognito | Recipe author. |
| Pebbles Flintstone | child | — | PIN `1234` | Earns wallet/points. |
| Dino | pet | — | none (no `account_id`/`pin_hash`) | Subject of "Feed Dino" chore. |

### A.2 The Rubbles (foreign-household isolation)

| Member | Role | Email | Auth |
|---|---|---|---|
| Barney Rubble | adult | barney@bedrock.test | Cognito |
| Betty Rubble | adult | betty@bedrock.test | Cognito |
| Bamm-Bamm Rubble | child | — | PIN `5678` |
| Hoppy | pet | — | none |

The Rubbles exist to assert that household scoping is enforced — a Flintstone token cannot read or write Rubble data, an event cannot have a Bamm-Bamm assignee, etc. Tests against the Flintstones must occasionally hit a Rubble endpoint expecting 403 / 404.

### A.3 Seed data per household

Each household gets enough realistic data to exercise every feature area at least once:

- **Calendar:** ≥1 upcoming event (e.g. "Bedrock Bowling Night", Fri evening) with `assigned_members = [fred, wilma]`. ≥1 past event (e.g. "Pebbles' Birthday"). ≥1 countdown event (`is_countdown=true`).
- **Recipes:** 3 owned by Wilma (Flintstones) / Betty (Rubbles): "Brontosaurus Steak", "Stone-Age Salad", "Cave Cookies". Each has 3-5 ingredients and 2-3 steps.
- **Recipe collections:** 1 collection "Date Night" containing 1 recipe.
- **Meal plan:** This week's plan, dinner each weekday is one of the recipes. Saturday lunch has `serving_multiplier = 2.5`.
- **Shopping:** A list with 3 items including 1 already checked off.
- **Chores:** "Feed Dino" assigned to Pebbles, weekly recurrence; "Wash dishes" daily, also Pebbles.
- **Chore wallet:** Pebbles starts with 50 stones (Flintstones' currency unit).
- **Points/rewards:** 1 reward "Extra TV Time" costs 100 points. Pebbles starts at 30 points.
- **Routines:** Morning routine for Pebbles with 3 steps (brush teeth, get dressed, breakfast).
- **Pantry:** 1 staple ("Salt") so the shopping-multiplier tests can verify it's appended (per #113).

Seeded values are deterministic — same `id`, same `created_at`, same `updated_at`. The test code asserts against these exact UUIDs.

## B. Code artifacts

### B.1 Go seed package

**Path:** `internal/test/seed/flintstones.go`

```go
package seed

import "context"
import "github.com/codingsandmore/tidyboard/internal/query"

// SeedFlintstones inserts both households and all canonical data deterministically.
// Idempotent: running twice is a no-op (uses ON CONFLICT DO NOTHING / upserts).
// Safe against ephemeral test postgres AND prod.
func SeedFlintstones(ctx context.Context, q *query.Queries) error { ... }

// FlintstoneIDs / RubbleIDs are exported constants so tests can reference them.
var (
    FlintstoneAccount  = uuid.MustParse("...")
    FlintstoneHousehold = uuid.MustParse("...")
    Fred, Wilma, Pebbles, Dino uuid.UUID = ...
    RubbleAccount, RubbleHousehold uuid.UUID = ...
    Barney, Betty, BammBamm, Hoppy uuid.UUID = ...
)
```

UUIDs are hard-coded in the package. Tests import them directly.

### B.2 Prod seed CLI

**Path:** `cmd/seed-flintstones/main.go`

```go
// Reads TIDYBOARD_DSN from env.
// Calls seed.SeedFlintstones(ctx, query.New(pool)).
// Prints summary on success, exits 1 on error.
```

`make seed-prod-flintstones` runs it. Operator runs it once to provision the prod households.

### B.3 Vitest fixture (live API shape)

**Path:** `web/src/test/fixtures/flintstones.ts`

Mirrors what the **server actually returns** — not what tests find convenient. Therefore:

- `assigned_members` is populated; `members` is **omitted** (undefined) on every event.
- All `recipe_ingredients` and `recipe_steps` are present as arrays (empty `[]` when no rows, never `undefined`) — matches #109's serialization fix.
- `last_fed_at` etc. on pets is omitted (feature doesn't exist yet).

```ts
export const flintstones = {
  household: { id: "...", name: "Flintstones" },
  fred: { id: "...", name: "Fred", role: "adult" as const, ... },
  wilma: { ... },
  pebbles: { id: "...", name: "Pebbles", role: "child" as const, ... },
  dino: { id: "...", name: "Dino", role: "pet" as const, ... },
  events: { bowlingNight: { id: "...", title: "Bedrock Bowling Night", assigned_members: ["fred-id", "wilma-id"], /* members: undefined */ } },
  recipes: { ... },
  mealPlan: { ... },
  // ...
};
export const rubbles = { ... };
```

UUIDs match the Go `seed` package exactly.

## C. FEATURES.md catalog

**Path:** `FEATURES.md` at repo root.

### C.1 Format

A table-per-area markdown file. Sections by feature area, sorted. Each row:

```
| Feature | Route(s) | Unit | Integration | E2E:dev | E2E:prod | Notes |
|---|---|---|---|---|---|---|
| Create event | POST /v1/events | ✅ | ✅ | ✅ | ✅ | flintstones-flow:calendar |
| Assign event member | POST /v1/events (assigned_members) | ✅ | ✅ | ⚠ | ✅ | partial unit cov; #112 regression |
| Pet edit/profile | n/a | ❌ | ❌ | ❌ | ❌ | Feature not built; future cycle |
```

Status legend: ✅ covered, ⚠ partial, ❌ no coverage, n/a not applicable.

### C.2 Required sections (initial)

1. Auth & Onboarding
2. Households & Members
3. Pets (status mostly ❌; documents the gap)
4. Calendar & Events
5. Recipes
6. Meal Plans
7. Shopping & Pantry
8. Chores & Wallet
9. Points & Rewards
10. Routines
11. Kiosk & Dashboards
12. Errors & Observability
13. Sync & Backup
14. Settings & Devices

### C.3 Update protocol

Every future autospec cycle MUST include `FEATURES.md` updates in its acceptance criteria. The autospec children created from this spec encode that obligation by adding it to AGENTS.md (see G).

## D. Playwright `e2e:prod` test suite

### D.1 Driver pattern

**Path:** `web/e2e-prod/tests/flintstones-flow.spec.ts` (umbrella file) + per-area sub-files.

Each test:
1. Authenticates as Fred via `TIDYBOARD_TEST_TOKEN`.
2. Asserts a feature renders (read smoke).
3. (where applicable) Creates a uniquely-named entity (suffix `e2e-{Date.now()}`).
4. Asserts it appears.
5. Deletes it.
6. Asserts it's gone.

Idempotent and self-cleaning. No long-lived test data accumulates in prod.

### D.2 Cross-household isolation

Each area also runs ≥1 negative assertion: a Flintstone token attempting to access a Rubble resource → 403/404.

### D.3 Coverage by area (5 child issues)

The areas are bundled into 5 manageable children:

| Child | Areas | Source FEATURES.md sections |
|---|---|---|
| `e2e:prod-auth-onboarding` | Auth, Households, Members, Pets (current — read-only) | 1, 2, 3 |
| `e2e:prod-calendar-kiosk` | Calendar, Kiosk dashboards (regression class trap) | 4, 11 |
| `e2e:prod-recipes-meals-shopping` | Recipes, Meal Plans, Shopping, Pantry | 5, 6, 7 |
| `e2e:prod-chores-wallet-rewards-routines` | Chores, Wallet, Points, Rewards, Routines (incl. "Feed Dino") | 8, 9, 10 |
| `e2e:prod-errors-sync` | Errors/Observability (request-id, ErrorAlert), Sync, Backup, Settings | 12, 13, 14 |

## E. Deploy gate

### E.1 Workflow integration

`.github/workflows/deploy-ec2.yml`:

```yaml
jobs:
  deploy:
    name: SSH deploy
    # ... (existing)

  e2e-prod-gate:
    name: Hard-fail e2e:prod gate
    needs: deploy
    runs-on: ubuntu-latest
    if: needs.deploy.result == 'success'
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22' }
      - run: cd web && npm ci
      - run: cd web && npx playwright install --with-deps chromium
      - run: cd web && npm run e2e:prod
        env:
          TIDYBOARD_PROD_URL: https://tidyboard.org
          TIDYBOARD_TEST_TOKEN: ${{ secrets.TIDYBOARD_TEST_TOKEN }}
        # 1 retry for transient network only (Playwright config); after that, fail.
```

A failing `e2e-prod-gate` does NOT roll back the deploy (we have no rollback infra); it surfaces the failure loud-and-clear, and blocks further deploys via `workflow_run` chaining: a failed `Deploy to EC2` workflow run prevents the next `workflow_run` from firing on success. (If GitHub Actions allows the next deploy to run despite the gate failing, we add a separate "deploy-blocking" condition in a follow-up.)

### E.2 Token management

`TIDYBOARD_TEST_TOKEN` is a long-lived Cognito JWT for Fred. Operator captures it from the browser:

1. Log in as `fred@bedrock.test` at `https://tidyboard.org`.
2. Open devtools → Application → Cookies (or wherever the JWT is held; `helpers/api.ts` reads `Authorization: Bearer <token>`).
3. Copy the token.
4. Add it to GitHub repo Settings → Secrets → Actions as `TIDYBOARD_TEST_TOKEN`.

The token expires per Cognito's TTL. Refresh playbook in the runbook (H.2). When the token is missing or expired, the e2e:prod gate fails with a clear error message instructing the operator to refresh.

## F. Test refactoring

### F.1 Migrate dashboard fixtures (the regression-class trap)

**Files:** `web/src/components/screens/dashboard-kiosk.test.tsx` and any other tests that hand-stub `TBDEvent`.

Replace with imports from `web/src/test/fixtures/flintstones.ts`. Key constraint: at least one test event has `assigned_members: ["fred-id", "wilma-id"]` and **NO `members` field**. This forces every consumer to handle the new shape; if a consumer regresses to direct `event.members.length`, the test crashes.

### F.2 Migrate Go integration tests

**Files:** `internal/handler/event_test.go`, `recipe_test.go`, `chore_test.go`, etc.

Replace ad-hoc `setupEventFixtures` with `seed.SeedFlintstones(ctx, q)`. Tests import the canonical IDs.

This is incremental — the issue specifies which tests migrate first (highest-value: dashboard + event handler). Remaining migrations roll into future autospec cycles.

## G. AGENTS.md update

Append to `AGENTS.md`:

> ### FEATURES.md is mandatory
>
> Every autospec cycle that adds, modifies, or removes a user-visible feature MUST update `FEATURES.md`. Before a child PR is mergeable, its diff must include either (a) a new row in the catalog if a new feature was introduced, or (b) updated coverage marks if existing features changed. The autospec implementer subagents are instructed to fail their PR if `FEATURES.md` was not touched alongside a feature change.
>
> ### Type-widening rule
>
> When an autospec issue widens a shared TS type (adds an optional field), the test plan MUST cover every existing reader of the field — not just the new writer. The minimum bar: at least one Vitest fixture must reflect the live API shape (the field present, old field absent or undefined). This is enforced by the Flintstones fixture: any consumer that direct-accesses an optional field will crash that fixture's tests.

## H. Operational runbook

### H.1 One-time prod seed

1. SSH to the EC2 box: `ssh ec2-user@98.91.94.149 -i tidyboard.pem`.
2. `cd /opt/tidyboard`.
3. `docker compose run --rm tidyboard /app/seed-flintstones`. (Or invoke via `make`-equivalent.)
4. Verify: `curl -H "Authorization: Bearer $FRED_TOKEN" https://tidyboard.org/api/v1/members` returns Fred/Wilma/Pebbles/Dino.

If the prod DB is fresh and has no data (per user's "we don't have data yet"), this is safe.

### H.2 Token rotation

When CI logs show `TIDYBOARD_TEST_TOKEN expired or missing`:

1. Log in to `https://tidyboard.org` as `fred@bedrock.test`.
2. Capture JWT from devtools.
3. Update `TIDYBOARD_TEST_TOKEN` in repo Settings → Secrets → Actions.
4. Re-run the failed deploy or push a no-op commit.

A future cycle may add a Cognito refresh-token flow to make this automatic.

## Cross-cutting conventions

- TDD non-negotiable.
- No DB mocks. Real Postgres for Go integration tests; the Flintstones seed serves as the canonical fixture.
- Conventional commits.
- Every PR in this cycle MUST update `FEATURES.md` for whatever it touches.
- Branch-per-issue.
- Auto-merge per AGENTS.md.
- Deterministic UUIDs in the seed (hard-coded constants); tests reference them directly.
- Idempotent seed (re-run is a no-op).

## Implementation order (dependency edges)

```
Foundation:
  B.1 Go seed package
    ↳ B.2 Prod seed CLI
    ↳ F.2 Migrate Go integration tests
  B.3 Vitest fixture
    ↳ F.1 Migrate dashboard fixtures
  C   FEATURES.md initial catalog
  G   AGENTS.md update

E2E coverage (depend on B.1, B.3, C):
  D.3.a auth-onboarding-pets
  D.3.b calendar-kiosk
  D.3.c recipes-meals-shopping
  D.3.d chores-wallet-rewards-routines
  D.3.e errors-sync-settings

Deploy gate:
  E   deploy-ec2.yml e2e-prod-gate (depends on at least D.3.a)

Operational:
  H   Runbook (depends on B.2)
```

Total: 1 epic + 13 children.

## Test gates per child

A child issue is "done" when:

1. `go build ./... && go vet ./...` is green.
2. `go test ./... -count=1 -tags=integration` covers the new code.
3. `cd web && npm test` is green for new tests.
4. Primary smoke test (per issue) passes locally.
5. Self-review subagent returns `LGTM`.
6. CI is green on the PR (the project's required-checks set).
7. **`FEATURES.md` is updated for any user-visible feature change.**

When all 7 are true, the autospec monitor admin-merges per AGENTS.md.

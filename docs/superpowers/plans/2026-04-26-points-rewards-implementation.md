# Behavior Points + Rewards Implementation Plan (Plan B of 2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the behavior-points + rewards half of the spec — categories, behaviors, point grants, scoreboard, rewards catalog, redemptions (self-serve + needs-approval), savings goals, per-kid reward cost adjustments, and a unified per-kid timeline. Live on tidyboard.org with kid + admin UI.

**Architecture:** Mirrors the Plan A wallet codepaths. Reuses `internal/{model,service,handler,query}` Go layout, sqlc-generated DB layer, JWT + household-scoped middleware, `broadcast.Broadcaster` for WebSocket, `AuditService` for audit log, `respond.JSON/Error` for HTTP responses. Frontend extends `web/src/lib/api/{types,hooks,fallback}.ts`, `web/src/components/screens/`, `web/src/app/`. Pure-function helpers (`effective_cost`) sit in `internal/service/points_math.go` so the math is heavily unit-tested with no DB.

**Tech Stack:** Go 1.24 · sqlc · goose migrations · chi router · Postgres · React 19 · Next.js 16 · Tailwind 4 · TanStack Query · Vitest · Playwright.

**Out of this plan (already shipped in Plan A):** chores, wallet ledger, allowance, ad-hoc tasks, week-end streak bonus cron.

**Spec source:** `git show origin/spec/chore-wallet-points:docs/superpowers/specs/2026-04-26-chore-wallet-points-design.md` (sections 3.2, 4.2, 5.1–5.6, 6.4–6.6, 6.8–6.10, 7).

---

## File Structure

### Backend (Go)
- Create: `migrations/20260427000030_points_rewards.sql` — all 7 tables in one migration
- Create: `sql/queries/points.sql` — categories + behaviors + grants
- Create: `sql/queries/reward.sql` — rewards + redemptions + savings_goals + reward_cost_adjustments + timeline aggregation
- Create: `internal/model/points.go` — request/response structs
- Create: `internal/model/reward.go` — request/response structs
- Create: `internal/service/points_math.go` — pure functions: `EffectiveCost`, `SumByCategory`. No DB. Heavily tested.
- Create: `internal/service/points_math_test.go`
- Create: `internal/service/points.go` — `PointsService` (categories CRUD, behaviors CRUD, grants, balance, scoreboard)
- Create: `internal/service/points_test.go`
- Create: `internal/service/reward.go` — `RewardService` (catalog CRUD, redemption state machine, savings goals, cost adjustments, timeline)
- Create: `internal/service/reward_test.go`
- Create: `internal/handler/points.go` — HTTP handlers (categories, behaviors, grants, balance, scoreboard)
- Create: `internal/handler/reward.go` — HTTP handlers (rewards, redemptions, savings goals, cost adjustments, timeline)
- Create: `internal/handler/points_test.go` — integration (`TIDYBOARD_TEST_DSN`)
- Create: `internal/handler/reward_test.go` — integration
- Modify: `cmd/server/main.go` — wire `PointsService` + `RewardService` + handlers + routes (after wallet wiring, around line 205)

### Frontend (TypeScript)
- Modify: `web/src/lib/api/types.ts` — add `ApiPointCategory`, `ApiBehavior`, `ApiPointGrant`, `ApiPointsBalance`, `ApiScoreboardEntry`, `ApiReward`, `ApiRedemption`, `ApiSavingsGoal`, `ApiRewardCostAdjustment`, `ApiTimelineEvent`, `ApiRedeemResponse`
- Modify: `web/src/lib/api/hooks.ts` — add hooks (full list in Phase 9)
- Modify: `web/src/lib/api/fallback.ts` — add fallback shapes for new domains
- Create: `web/src/lib/points/effective-cost.ts` — TypeScript mirror of Go `EffectiveCost`
- Create: `web/src/lib/points/effective-cost.test.ts` — same table-driven cases as Go
- Create: `web/src/components/ui/points-badge.tsx` — per-category color + value pill
- Create: `web/src/components/ui/points-badge.test.tsx`
- Create: `web/src/components/ui/reward-card.tsx` — image + cost + progress ring (uses effective_cost in member context)
- Create: `web/src/components/ui/reward-card.test.tsx`
- Create: `web/src/components/screens/rewards-kid.tsx`
- Create: `web/src/components/screens/rewards-kid.test.tsx`
- Create: `web/src/components/screens/scoreboard.tsx`
- Create: `web/src/components/screens/scoreboard.test.tsx`
- Create: `web/src/components/screens/timeline.tsx`
- Create: `web/src/components/screens/timeline.test.tsx`
- Create: `web/src/components/screens/points-admin.tsx`
- Create: `web/src/components/screens/quick-award.tsx`
- Create: `web/src/components/screens/rewards-admin.tsx`
- Create: `web/src/app/rewards/page.tsx`
- Create: `web/src/app/scoreboard/page.tsx`
- Create: `web/src/app/timeline/[memberId]/page.tsx`
- Create: `web/src/app/admin/points/page.tsx`
- Create: `web/src/app/admin/points/award/page.tsx`
- Create: `web/src/app/admin/rewards/page.tsx`
- Modify: `web/src/components/screens/dashboard-phone.tsx` — Rewards/Scoreboard nav + Pending-approvals badge
- Modify: `web/src/components/screens/dashboard-desktop.tsx` — Scoreboard widget + Quick-award widget + Pending-approvals badge
- Modify: `web/src/i18n/messages/en.json` + `de.json` — points/rewards/scoreboard strings
- Create: `web/e2e/rewards.spec.ts` — kid + admin redemption happy path against fallback mode
- Modify: `web/e2e-prod/tests/family-flow.spec.ts` — add prod CRUD round-trip for points + rewards
- Modify: `web/e2e-prod/helpers/api.ts` — add points/reward API helpers

---

## Phase 1: Database schema

### Task 1: Create the points + rewards migration

**Files:**
- Create: `migrations/20260427000030_points_rewards.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- +goose Up
-- +goose StatementBegin
CREATE TABLE point_categories (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id  UUID        NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    name          TEXT        NOT NULL,
    color         TEXT        NOT NULL DEFAULT '#6b7280',
    sort_order    INT         NOT NULL DEFAULT 0,
    archived_at   TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_point_categories_household ON point_categories (household_id) WHERE archived_at IS NULL;
-- +goose StatementEnd

-- +goose StatementBegin
CREATE TABLE behaviors (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id      UUID        NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    category_id       UUID        NOT NULL REFERENCES point_categories(id) ON DELETE CASCADE,
    name              TEXT        NOT NULL,
    suggested_points  INT         NOT NULL DEFAULT 1,
    archived_at       TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_behaviors_household ON behaviors (household_id) WHERE archived_at IS NULL;
CREATE INDEX idx_behaviors_category ON behaviors (category_id) WHERE archived_at IS NULL;
-- +goose StatementEnd

-- +goose StatementBegin
CREATE TABLE point_grants (
    id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id             UUID        NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    member_id                UUID        NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    category_id              UUID        REFERENCES point_categories(id) ON DELETE SET NULL,
    behavior_id              UUID        REFERENCES behaviors(id) ON DELETE SET NULL,
    points                   INT         NOT NULL,
    reason                   TEXT        NOT NULL DEFAULT '',
    granted_by_account_id    UUID        REFERENCES accounts(id) ON DELETE SET NULL,
    granted_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_point_grants_member ON point_grants (member_id, granted_at DESC);
CREATE INDEX idx_point_grants_household ON point_grants (household_id, granted_at DESC);
CREATE INDEX idx_point_grants_category ON point_grants (category_id, granted_at DESC);
-- +goose StatementEnd

-- +goose StatementBegin
CREATE TABLE rewards (
    id                     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id           UUID        NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    name                   TEXT        NOT NULL,
    description            TEXT        NOT NULL DEFAULT '',
    image_url              TEXT,
    cost_points            INT         NOT NULL CHECK (cost_points >= 0),
    fulfillment_kind       TEXT        NOT NULL DEFAULT 'needs_approval' CHECK (fulfillment_kind IN ('self_serve','needs_approval')),
    active                 BOOLEAN     NOT NULL DEFAULT TRUE,
    created_by_account_id  UUID        REFERENCES accounts(id) ON DELETE SET NULL,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_rewards_household ON rewards (household_id) WHERE active = TRUE;
-- +goose StatementEnd

-- +goose StatementBegin
CREATE TABLE redemptions (
    id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id             UUID        NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    reward_id                UUID        NOT NULL REFERENCES rewards(id) ON DELETE CASCADE,
    member_id                UUID        NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    points_at_redemption     INT         NOT NULL,
    status                   TEXT        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','fulfilled','declined')),
    requested_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    decided_at               TIMESTAMPTZ,
    decided_by_account_id    UUID        REFERENCES accounts(id) ON DELETE SET NULL,
    fulfilled_at             TIMESTAMPTZ,
    decline_reason           TEXT        NOT NULL DEFAULT '',
    grant_id                 UUID        REFERENCES point_grants(id) ON DELETE SET NULL
);
CREATE INDEX idx_redemptions_member ON redemptions (member_id, requested_at DESC);
CREATE INDEX idx_redemptions_household_status ON redemptions (household_id, status);
-- +goose StatementEnd

-- +goose StatementBegin
CREATE TABLE savings_goals (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id    UUID        NOT NULL UNIQUE REFERENCES members(id) ON DELETE CASCADE,
    reward_id    UUID        NOT NULL REFERENCES rewards(id) ON DELETE CASCADE,
    started_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    cleared_at   TIMESTAMPTZ
);
-- +goose StatementEnd

-- +goose StatementBegin
CREATE TABLE reward_cost_adjustments (
    id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id             UUID        NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    member_id                UUID        NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    reward_id                UUID        NOT NULL REFERENCES rewards(id) ON DELETE CASCADE,
    delta_points             INT         NOT NULL,
    reason                   TEXT        NOT NULL DEFAULT '',
    expires_at               TIMESTAMPTZ,
    created_by_account_id    UUID        REFERENCES accounts(id) ON DELETE SET NULL,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_reward_adj_member_reward ON reward_cost_adjustments (member_id, reward_id);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS reward_cost_adjustments;
DROP TABLE IF EXISTS savings_goals;
DROP TABLE IF EXISTS redemptions;
DROP TABLE IF EXISTS rewards;
DROP TABLE IF EXISTS point_grants;
DROP TABLE IF EXISTS behaviors;
DROP TABLE IF EXISTS point_categories;
-- +goose StatementEnd
```

- [ ] **Step 2: Apply migration locally**

Run: `make migrate` (or `goose -dir migrations postgres "$DATABASE_URL" up`)
Expected: `OK 20260427000030_points_rewards.sql`

- [ ] **Step 3: Verify tables exist**

Run: `psql "$DATABASE_URL" -c "\dt point_categories behaviors point_grants rewards redemptions savings_goals reward_cost_adjustments"`
Expected: 7 tables listed.

- [ ] **Step 4: Test the rollback**

Run: `goose -dir migrations postgres "$DATABASE_URL" down && goose -dir migrations postgres "$DATABASE_URL" up`
Expected: Down then Up both succeed.

- [ ] **Step 5: Commit**

```bash
git add migrations/20260427000030_points_rewards.sql
git commit -m "feat(db): points + rewards schema (categories, behaviors, grants, rewards, redemptions, savings, adjustments)"
```

---

## Phase 2: sqlc queries

### Task 2: Write sqlc queries for points (categories, behaviors, grants)

**Files:**
- Create: `sql/queries/points.sql`

- [ ] **Step 1: Write the query file**

```sql
-- sql/queries/points.sql

-- ── Categories ──────────────────────────────────────────────────────────────

-- name: CreatePointCategory :one
INSERT INTO point_categories (id, household_id, name, color, sort_order, created_at, updated_at)
VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
RETURNING *;

-- name: GetPointCategory :one
SELECT * FROM point_categories WHERE id = $1 AND household_id = $2 LIMIT 1;

-- name: ListPointCategories :many
SELECT * FROM point_categories
WHERE household_id = $1
  AND (sqlc.arg(include_archived)::boolean OR archived_at IS NULL)
ORDER BY sort_order ASC, name ASC;

-- name: UpdatePointCategory :one
UPDATE point_categories
SET name        = COALESCE(sqlc.narg(name), name),
    color       = COALESCE(sqlc.narg(color), color),
    sort_order  = COALESCE(sqlc.narg(sort_order), sort_order),
    updated_at  = NOW()
WHERE id = $1 AND household_id = $2
RETURNING *;

-- name: ArchivePointCategory :exec
UPDATE point_categories SET archived_at = NOW(), updated_at = NOW()
WHERE id = $1 AND household_id = $2;

-- ── Behaviors ───────────────────────────────────────────────────────────────

-- name: CreateBehavior :one
INSERT INTO behaviors (id, household_id, category_id, name, suggested_points, created_at, updated_at)
VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
RETURNING *;

-- name: GetBehavior :one
SELECT * FROM behaviors WHERE id = $1 AND household_id = $2 LIMIT 1;

-- name: ListBehaviors :many
SELECT * FROM behaviors
WHERE household_id = $1
  AND (sqlc.narg(category_id)::uuid IS NULL OR category_id = sqlc.narg(category_id)::uuid)
  AND (sqlc.arg(include_archived)::boolean OR archived_at IS NULL)
ORDER BY name ASC;

-- name: UpdateBehavior :one
UPDATE behaviors
SET name             = COALESCE(sqlc.narg(name), name),
    category_id      = COALESCE(sqlc.narg(category_id)::uuid, category_id),
    suggested_points = COALESCE(sqlc.narg(suggested_points), suggested_points),
    updated_at       = NOW()
WHERE id = $1 AND household_id = $2
RETURNING *;

-- name: ArchiveBehavior :exec
UPDATE behaviors SET archived_at = NOW(), updated_at = NOW()
WHERE id = $1 AND household_id = $2;

-- ── Point grants ────────────────────────────────────────────────────────────

-- name: CreatePointGrant :one
INSERT INTO point_grants (id, household_id, member_id, category_id, behavior_id, points, reason, granted_by_account_id, granted_at)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
RETURNING *;

-- name: GetPointGrant :one
SELECT * FROM point_grants WHERE id = $1 LIMIT 1;

-- name: ListPointGrants :many
SELECT * FROM point_grants
WHERE household_id = $1
  AND (sqlc.narg(member_id)::uuid IS NULL OR member_id = sqlc.narg(member_id)::uuid)
ORDER BY granted_at DESC
LIMIT $2 OFFSET $3;

-- name: SumPointsByMember :one
SELECT COALESCE(SUM(points), 0)::BIGINT AS total
FROM point_grants
WHERE member_id = $1;

-- name: SumPointsByMemberAndCategory :many
SELECT category_id, COALESCE(SUM(points), 0)::BIGINT AS total
FROM point_grants
WHERE member_id = $1
GROUP BY category_id;

-- name: ScoreboardTotals :many
SELECT m.id AS member_id, COALESCE(SUM(pg.points), 0)::BIGINT AS total
FROM members m
LEFT JOIN point_grants pg ON pg.member_id = m.id
WHERE m.household_id = $1
GROUP BY m.id
ORDER BY total DESC;

-- name: ScoreboardByCategory :many
SELECT m.id AS member_id, pg.category_id, COALESCE(SUM(pg.points), 0)::BIGINT AS total
FROM members m
LEFT JOIN point_grants pg ON pg.member_id = m.id
WHERE m.household_id = $1
GROUP BY m.id, pg.category_id;
```

- [ ] **Step 2: Generate Go bindings**

Run: `make sqlc` (or `sqlc generate`)
Expected: `internal/query/points.sql.go` created with `CreatePointCategory`, `ListBehaviors`, `SumPointsByMember`, etc.

- [ ] **Step 3: Verify generated code compiles**

Run: `go build ./...`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add sql/queries/points.sql internal/query/
git commit -m "feat(query): sqlc queries for point categories, behaviors, grants"
```

---

### Task 3: Write sqlc queries for rewards (catalog, redemptions, savings, adjustments)

**Files:**
- Create: `sql/queries/reward.sql`

- [ ] **Step 1: Write the query file**

```sql
-- sql/queries/reward.sql

-- ── Rewards catalog ─────────────────────────────────────────────────────────

-- name: CreateReward :one
INSERT INTO rewards (id, household_id, name, description, image_url, cost_points, fulfillment_kind, active, created_by_account_id, created_at, updated_at)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
RETURNING *;

-- name: GetReward :one
SELECT * FROM rewards WHERE id = $1 AND household_id = $2 LIMIT 1;

-- name: ListRewards :many
SELECT * FROM rewards
WHERE household_id = $1
  AND (sqlc.arg(only_active)::boolean = FALSE OR active = TRUE)
ORDER BY name ASC;

-- name: UpdateReward :one
UPDATE rewards
SET name             = COALESCE(sqlc.narg(name), name),
    description      = COALESCE(sqlc.narg(description), description),
    image_url        = COALESCE(sqlc.narg(image_url), image_url),
    cost_points      = COALESCE(sqlc.narg(cost_points), cost_points),
    fulfillment_kind = COALESCE(sqlc.narg(fulfillment_kind), fulfillment_kind),
    active           = COALESCE(sqlc.narg(active), active),
    updated_at       = NOW()
WHERE id = $1 AND household_id = $2
RETURNING *;

-- name: ArchiveReward :exec
UPDATE rewards SET active = FALSE, updated_at = NOW()
WHERE id = $1 AND household_id = $2;

-- ── Redemptions ─────────────────────────────────────────────────────────────

-- name: CreateRedemption :one
INSERT INTO redemptions (id, household_id, reward_id, member_id, points_at_redemption, status, requested_at)
VALUES ($1, $2, $3, $4, $5, $6, NOW())
RETURNING *;

-- name: GetRedemption :one
SELECT * FROM redemptions WHERE id = $1 AND household_id = $2 LIMIT 1;

-- name: ListRedemptions :many
SELECT * FROM redemptions
WHERE household_id = $1
  AND (sqlc.narg(member_id)::uuid IS NULL OR member_id = sqlc.narg(member_id)::uuid)
  AND (sqlc.narg(status)::text IS NULL OR status = sqlc.narg(status)::text)
ORDER BY requested_at DESC
LIMIT $2 OFFSET $3;

-- name: SetRedemptionStatus :one
UPDATE redemptions
SET status                = sqlc.arg(status),
    decided_at            = COALESCE(sqlc.narg(decided_at), decided_at),
    decided_by_account_id = COALESCE(sqlc.narg(decided_by_account_id)::uuid, decided_by_account_id),
    fulfilled_at          = COALESCE(sqlc.narg(fulfilled_at), fulfilled_at),
    decline_reason        = COALESCE(sqlc.narg(decline_reason), decline_reason),
    grant_id              = COALESCE(sqlc.narg(grant_id)::uuid, grant_id)
WHERE id = $1 AND household_id = $2
RETURNING *;

-- ── Savings goals ───────────────────────────────────────────────────────────

-- name: GetActiveSavingsGoal :one
SELECT * FROM savings_goals
WHERE member_id = $1 AND cleared_at IS NULL
LIMIT 1;

-- name: UpsertSavingsGoal :one
INSERT INTO savings_goals (id, member_id, reward_id, started_at)
VALUES ($1, $2, $3, NOW())
ON CONFLICT (member_id) DO UPDATE
SET reward_id  = EXCLUDED.reward_id,
    started_at = NOW(),
    cleared_at = NULL
RETURNING *;

-- name: ClearSavingsGoal :exec
UPDATE savings_goals SET cleared_at = NOW()
WHERE member_id = $1 AND cleared_at IS NULL;

-- ── Reward cost adjustments ─────────────────────────────────────────────────

-- name: CreateRewardCostAdjustment :one
INSERT INTO reward_cost_adjustments (id, household_id, member_id, reward_id, delta_points, reason, expires_at, created_by_account_id, created_at)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
RETURNING *;

-- name: ListActiveRewardCostAdjustments :many
SELECT * FROM reward_cost_adjustments
WHERE member_id = $1 AND reward_id = $2
  AND (expires_at IS NULL OR expires_at > NOW());

-- name: ListAllRewardCostAdjustments :many
SELECT * FROM reward_cost_adjustments
WHERE household_id = $1
  AND (sqlc.narg(member_id)::uuid IS NULL OR member_id = sqlc.narg(member_id)::uuid)
  AND (sqlc.narg(reward_id)::uuid IS NULL OR reward_id = sqlc.narg(reward_id)::uuid)
ORDER BY created_at DESC;

-- name: DeleteRewardCostAdjustment :exec
DELETE FROM reward_cost_adjustments
WHERE id = $1 AND household_id = $2;

-- ── Timeline (unified per-kid stream) ───────────────────────────────────────

-- Composite query: pulls grants + redemptions + cost-adjustments + wallet
-- transactions for a single member, newest first. Each row carries a `kind`
-- discriminator so the handler can shape the response.
-- name: TimelineForMember :many
SELECT
    'point_grant'::text         AS kind,
    pg.id                        AS id,
    pg.granted_at                AS occurred_at,
    pg.points::BIGINT            AS amount,
    pg.reason                    AS reason,
    pg.behavior_id::text         AS ref_a,
    pg.category_id::text         AS ref_b
FROM point_grants pg
WHERE pg.member_id = $1
UNION ALL
SELECT
    'redemption'::text,
    r.id,
    r.requested_at,
    r.points_at_redemption::BIGINT,
    r.status,
    r.reward_id::text,
    NULL
FROM redemptions r
WHERE r.member_id = $1
UNION ALL
SELECT
    'reward_cost_adjustment'::text,
    rca.id,
    rca.created_at,
    rca.delta_points::BIGINT,
    rca.reason,
    rca.reward_id::text,
    NULL
FROM reward_cost_adjustments rca
WHERE rca.member_id = $1
UNION ALL
SELECT
    'wallet_transaction'::text,
    wt.id,
    wt.created_at,
    wt.amount_cents,
    wt.reason,
    wt.kind,
    NULL
FROM wallet_transactions wt
WHERE wt.member_id = $1
ORDER BY occurred_at DESC
LIMIT $2 OFFSET $3;
```

- [ ] **Step 2: Generate Go bindings**

Run: `make sqlc`
Expected: `internal/query/reward.sql.go` created.

- [ ] **Step 3: Verify generated code compiles**

Run: `go build ./...`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add sql/queries/reward.sql internal/query/
git commit -m "feat(query): sqlc queries for rewards, redemptions, savings, cost adjustments, timeline"
```

---

## Phase 3: Pure-function math (TDD-first)

### Task 4: Write failing test for `EffectiveCost`

**Files:**
- Create: `internal/service/points_math_test.go`

- [ ] **Step 1: Write the failing test**

```go
package service

import (
	"testing"
	"time"
)

type adj struct {
	delta     int
	expiresAt *time.Time
}

func TestEffectiveCost(t *testing.T) {
	now := time.Date(2026, 4, 26, 12, 0, 0, 0, time.UTC)
	past := now.Add(-time.Hour)
	future := now.Add(time.Hour)

	cases := []struct {
		name    string
		base    int
		adjs    []adj
		want    int
	}{
		{"no adjustments", 100, nil, 100},
		{"one positive adjustment", 100, []adj{{delta: 50, expiresAt: nil}}, 150},
		{"one negative adjustment (forgiveness)", 100, []adj{{delta: -25, expiresAt: nil}}, 75},
		{"sum of multiple adjustments", 100, []adj{{delta: 30, expiresAt: nil}, {delta: 20, expiresAt: nil}}, 150},
		{"expired adjustment ignored", 100, []adj{{delta: 50, expiresAt: &past}}, 100},
		{"future-expiring adjustment counted", 100, []adj{{delta: 50, expiresAt: &future}}, 150},
		{"floor at zero (cannot go negative)", 100, []adj{{delta: -250, expiresAt: nil}}, 0},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			deltas := make([]CostAdjustment, len(tc.adjs))
			for i, a := range tc.adjs {
				deltas[i] = CostAdjustment{Delta: a.delta, ExpiresAt: a.expiresAt}
			}
			got := EffectiveCost(tc.base, deltas, now)
			if got != tc.want {
				t.Fatalf("EffectiveCost(%d, %+v) = %d, want %d", tc.base, deltas, got, tc.want)
			}
		})
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `go test ./internal/service/ -run TestEffectiveCost`
Expected: FAIL with `undefined: EffectiveCost` / `undefined: CostAdjustment`.

- [ ] **Step 3: Write the implementation**

Create `internal/service/points_math.go`:

```go
package service

import "time"

// CostAdjustment is a per-member, per-reward effective-cost shift.
type CostAdjustment struct {
	Delta     int
	ExpiresAt *time.Time
}

// EffectiveCost returns base + sum of currently-active adjustments,
// floored at zero. An adjustment is "active" if it has no expires_at
// or its expires_at is in the future relative to `now`.
func EffectiveCost(base int, adjs []CostAdjustment, now time.Time) int {
	total := base
	for _, a := range adjs {
		if a.ExpiresAt != nil && !a.ExpiresAt.After(now) {
			continue
		}
		total += a.Delta
	}
	if total < 0 {
		return 0
	}
	return total
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `go test ./internal/service/ -run TestEffectiveCost -v`
Expected: PASS for all 7 sub-cases.

- [ ] **Step 5: Commit**

```bash
git add internal/service/points_math.go internal/service/points_math_test.go
git commit -m "feat(service): EffectiveCost helper with table-driven tests"
```

---

### Task 5: Mirror `EffectiveCost` in TypeScript

**Files:**
- Create: `web/src/lib/points/effective-cost.ts`
- Create: `web/src/lib/points/effective-cost.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { effectiveCost, type CostAdjustment } from "./effective-cost";

describe("effectiveCost", () => {
  const now = new Date("2026-04-26T12:00:00Z");
  const past = new Date("2026-04-26T11:00:00Z").toISOString();
  const future = new Date("2026-04-26T13:00:00Z").toISOString();

  const cases: Array<{ name: string; base: number; adjs: CostAdjustment[]; want: number }> = [
    { name: "no adjustments", base: 100, adjs: [], want: 100 },
    { name: "one positive", base: 100, adjs: [{ delta: 50, expires_at: null }], want: 150 },
    { name: "one negative (forgiveness)", base: 100, adjs: [{ delta: -25, expires_at: null }], want: 75 },
    { name: "sum of multiple", base: 100, adjs: [{ delta: 30, expires_at: null }, { delta: 20, expires_at: null }], want: 150 },
    { name: "expired ignored", base: 100, adjs: [{ delta: 50, expires_at: past }], want: 100 },
    { name: "future-expiring counted", base: 100, adjs: [{ delta: 50, expires_at: future }], want: 150 },
    { name: "floor at zero", base: 100, adjs: [{ delta: -250, expires_at: null }], want: 0 },
  ];

  for (const tc of cases) {
    it(tc.name, () => {
      expect(effectiveCost(tc.base, tc.adjs, now)).toBe(tc.want);
    });
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && npx vitest run src/lib/points/effective-cost.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```ts
// web/src/lib/points/effective-cost.ts
export interface CostAdjustment {
  delta: number;
  expires_at: string | null;
}

export function effectiveCost(
  base: number,
  adjs: CostAdjustment[],
  now: Date = new Date()
): number {
  let total = base;
  for (const a of adjs) {
    if (a.expires_at && new Date(a.expires_at) <= now) continue;
    total += a.delta;
  }
  return total < 0 ? 0 : total;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd web && npx vitest run src/lib/points/effective-cost.test.ts`
Expected: PASS for all 7 sub-cases.

- [ ] **Step 5: Commit**

```bash
git add web/src/lib/points/effective-cost.ts web/src/lib/points/effective-cost.test.ts
git commit -m "feat(web): effectiveCost mirror of Go helper"
```

---

## Phase 4: Points service (Go)

### Task 6: Models for points domain

**Files:**
- Create: `internal/model/points.go`

- [ ] **Step 1: Write the file**

```go
package model

import (
	"github.com/google/uuid"
)

// CreatePointCategoryRequest is what POST /v1/point-categories accepts.
type CreatePointCategoryRequest struct {
	Name      string `json:"name"        validate:"required,min=1,max=80"`
	Color     string `json:"color"       validate:"required,hexcolor"`
	SortOrder int    `json:"sort_order"`
}

// UpdatePointCategoryRequest is the PATCH body. All fields optional.
type UpdatePointCategoryRequest struct {
	Name      *string `json:"name,omitempty"`
	Color     *string `json:"color,omitempty"`
	SortOrder *int    `json:"sort_order,omitempty"`
}

// CreateBehaviorRequest is what POST /v1/behaviors accepts.
type CreateBehaviorRequest struct {
	CategoryID       uuid.UUID `json:"category_id"       validate:"required"`
	Name             string    `json:"name"              validate:"required,min=1,max=80"`
	SuggestedPoints  int       `json:"suggested_points"  validate:"gte=0"`
}

// UpdateBehaviorRequest is the PATCH body.
type UpdateBehaviorRequest struct {
	CategoryID       *uuid.UUID `json:"category_id,omitempty"`
	Name             *string    `json:"name,omitempty"`
	SuggestedPoints  *int       `json:"suggested_points,omitempty"`
}

// GrantPointsRequest is what POST /v1/points/{member_id}/grant accepts.
type GrantPointsRequest struct {
	BehaviorID *uuid.UUID `json:"behavior_id,omitempty"`
	CategoryID *uuid.UUID `json:"category_id,omitempty"`
	Points     int        `json:"points"  validate:"required"`
	Reason     string     `json:"reason"`
}

// AdjustPointsRequest is the admin ± override.
type AdjustPointsRequest struct {
	Points int    `json:"points"  validate:"required"`
	Reason string `json:"reason"  validate:"required,min=1,max=200"`
}

// PointsBalanceResponse is the GET /v1/points/{member_id} payload.
type PointsBalanceResponse struct {
	MemberID    uuid.UUID            `json:"member_id"`
	Total       int64                `json:"total"`
	ByCategory  []CategoryTotal      `json:"by_category"`
	Recent      []PointGrantSummary  `json:"recent"`
}

// CategoryTotal is one row of a per-category breakdown.
type CategoryTotal struct {
	CategoryID *uuid.UUID `json:"category_id"`
	Total      int64      `json:"total"`
}

// PointGrantSummary is the recent-history slice on the balance response.
type PointGrantSummary struct {
	ID         uuid.UUID  `json:"id"`
	Points     int        `json:"points"`
	Reason     string     `json:"reason"`
	CategoryID *uuid.UUID `json:"category_id"`
	BehaviorID *uuid.UUID `json:"behavior_id"`
	GrantedAt  string     `json:"granted_at"`
}

// ScoreboardEntry is one row in the GET /v1/points/scoreboard response.
type ScoreboardEntry struct {
	MemberID   uuid.UUID       `json:"member_id"`
	Total      int64           `json:"total"`
	ByCategory []CategoryTotal `json:"by_category"`
}
```

- [ ] **Step 2: Verify compiles**

Run: `go build ./...`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add internal/model/points.go
git commit -m "feat(model): request/response structs for points domain"
```

---

### Task 7: PointsService — categories + behaviors CRUD

**Files:**
- Create: `internal/service/points.go`
- Create: `internal/service/points_test.go`

- [ ] **Step 1: Write a failing test**

```go
package service

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/tidyboard/tidyboard/internal/testutil"
)

func TestPointsService_CategoryCRUD(t *testing.T) {
	q := testutil.NewQueriesT(t) // helper that opens TIDYBOARD_TEST_DSN, truncates, returns *query.Queries
	svc := NewPointsService(q, nil, nil)

	hh := testutil.NewHouseholdT(t, q)

	c, err := svc.CreateCategory(context.Background(), hh.ID, "Kindness", "#ec4899", 1)
	if err != nil { t.Fatal(err) }
	if c.Name != "Kindness" { t.Fatalf("got %q", c.Name) }

	list, err := svc.ListCategories(context.Background(), hh.ID, false)
	if err != nil { t.Fatal(err) }
	if len(list) != 1 { t.Fatalf("len=%d", len(list)) }

	name := "Kind"
	upd, err := svc.UpdateCategory(context.Background(), hh.ID, c.ID, &name, nil, nil)
	if err != nil { t.Fatal(err) }
	if upd.Name != "Kind" { t.Fatalf("got %q", upd.Name) }

	if err := svc.ArchiveCategory(context.Background(), hh.ID, c.ID); err != nil { t.Fatal(err) }
	list2, _ := svc.ListCategories(context.Background(), hh.ID, false)
	if len(list2) != 0 { t.Fatalf("expected archived to be hidden, got %d", len(list2)) }

	_ = uuid.New()
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `TIDYBOARD_TEST_DSN=postgres://… go test ./internal/service/ -run TestPointsService_CategoryCRUD`
Expected: FAIL — `undefined: NewPointsService`.

- [ ] **Step 3: Write the implementation**

```go
package service

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/tidyboard/tidyboard/internal/broadcast"
	"github.com/tidyboard/tidyboard/internal/query"
)

// PointsService manages point categories, behaviors, grants, and balance reads.
type PointsService struct {
	q     *query.Queries
	bc    broadcast.Broadcaster
	audit *AuditService
}

func NewPointsService(q *query.Queries, bc broadcast.Broadcaster, audit *AuditService) *PointsService {
	return &PointsService{q: q, bc: bc, audit: audit}
}

// ── Categories ─────────────────────────────────────────────────────────────

func (s *PointsService) CreateCategory(ctx context.Context, householdID uuid.UUID, name, color string, sortOrder int) (query.PointCategory, error) {
	return s.q.CreatePointCategory(ctx, query.CreatePointCategoryParams{
		ID:          uuid.New(),
		HouseholdID: householdID,
		Name:        name,
		Color:       color,
		SortOrder:   int32(sortOrder),
	})
}

func (s *PointsService) ListCategories(ctx context.Context, householdID uuid.UUID, includeArchived bool) ([]query.PointCategory, error) {
	return s.q.ListPointCategories(ctx, query.ListPointCategoriesParams{
		HouseholdID:     householdID,
		IncludeArchived: includeArchived,
	})
}

func (s *PointsService) UpdateCategory(ctx context.Context, householdID, id uuid.UUID, name, color *string, sortOrder *int) (query.PointCategory, error) {
	params := query.UpdatePointCategoryParams{ID: id, HouseholdID: householdID}
	if name != nil      { params.Name = pgText(*name) }
	if color != nil     { params.Color = pgText(*color) }
	if sortOrder != nil { params.SortOrder = pgInt(int32(*sortOrder)) }
	return s.q.UpdatePointCategory(ctx, params)
}

func (s *PointsService) ArchiveCategory(ctx context.Context, householdID, id uuid.UUID) error {
	return s.q.ArchivePointCategory(ctx, query.ArchivePointCategoryParams{ID: id, HouseholdID: householdID})
}
```

(`pgText` / `pgInt` helpers should be added to `internal/service/util.go` if they don't already exist for the sqlc-generated nullable types — pattern matches `internal/service/wallet.go`'s use of `pgtype`.)

- [ ] **Step 4: Run test to verify it passes**

Run: `TIDYBOARD_TEST_DSN=postgres://… go test ./internal/service/ -run TestPointsService_CategoryCRUD -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add internal/service/points.go internal/service/points_test.go internal/service/util.go
git commit -m "feat(service): point category CRUD"
```

---

### Task 8: PointsService — behaviors CRUD

**Files:**
- Modify: `internal/service/points.go` — append Behavior methods
- Modify: `internal/service/points_test.go` — append `TestPointsService_BehaviorCRUD`

- [ ] **Step 1: Add the failing test**

Append to `points_test.go`:

```go
func TestPointsService_BehaviorCRUD(t *testing.T) {
	q := testutil.NewQueriesT(t)
	svc := NewPointsService(q, nil, nil)
	hh := testutil.NewHouseholdT(t, q)
	cat, _ := svc.CreateCategory(context.Background(), hh.ID, "Effort", "#10b981", 1)

	b, err := svc.CreateBehavior(context.Background(), hh.ID, cat.ID, "Did homework without reminder", 5)
	if err != nil { t.Fatal(err) }
	if b.SuggestedPoints != 5 { t.Fatalf("got %d", b.SuggestedPoints) }

	list, err := svc.ListBehaviors(context.Background(), hh.ID, &cat.ID, false)
	if err != nil { t.Fatal(err) }
	if len(list) != 1 { t.Fatalf("len=%d", len(list)) }

	if err := svc.ArchiveBehavior(context.Background(), hh.ID, b.ID); err != nil { t.Fatal(err) }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `go test ./internal/service/ -run TestPointsService_BehaviorCRUD`
Expected: FAIL — `undefined: CreateBehavior`.

- [ ] **Step 3: Implement Behavior methods**

Append to `points.go`:

```go
// ── Behaviors ──────────────────────────────────────────────────────────────

func (s *PointsService) CreateBehavior(ctx context.Context, householdID, categoryID uuid.UUID, name string, suggestedPoints int) (query.Behavior, error) {
	return s.q.CreateBehavior(ctx, query.CreateBehaviorParams{
		ID:               uuid.New(),
		HouseholdID:      householdID,
		CategoryID:       categoryID,
		Name:             name,
		SuggestedPoints:  int32(suggestedPoints),
	})
}

func (s *PointsService) ListBehaviors(ctx context.Context, householdID uuid.UUID, categoryID *uuid.UUID, includeArchived bool) ([]query.Behavior, error) {
	var cat *uuid.NullUUID
	if categoryID != nil {
		cat = &uuid.NullUUID{UUID: *categoryID, Valid: true}
	}
	return s.q.ListBehaviors(ctx, query.ListBehaviorsParams{
		HouseholdID:     householdID,
		CategoryID:      cat,
		IncludeArchived: includeArchived,
	})
}

func (s *PointsService) UpdateBehavior(ctx context.Context, householdID, id uuid.UUID, name *string, categoryID *uuid.UUID, suggestedPoints *int) (query.Behavior, error) {
	params := query.UpdateBehaviorParams{ID: id, HouseholdID: householdID}
	if name != nil             { params.Name = pgText(*name) }
	if categoryID != nil       { params.CategoryID = &uuid.NullUUID{UUID: *categoryID, Valid: true} }
	if suggestedPoints != nil  { params.SuggestedPoints = pgInt(int32(*suggestedPoints)) }
	return s.q.UpdateBehavior(ctx, params)
}

func (s *PointsService) ArchiveBehavior(ctx context.Context, householdID, id uuid.UUID) error {
	return s.q.ArchiveBehavior(ctx, query.ArchiveBehaviorParams{ID: id, HouseholdID: householdID})
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `go test ./internal/service/ -run TestPointsService_BehaviorCRUD -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add internal/service/points.go internal/service/points_test.go
git commit -m "feat(service): behavior CRUD"
```

---

### Task 9: PointsService — grants, balance, scoreboard

**Files:**
- Modify: `internal/service/points.go` — append Grant/Balance/Scoreboard methods
- Modify: `internal/service/points_test.go` — append `TestPointsService_GrantBalanceScoreboard`

- [ ] **Step 1: Add the failing test**

```go
func TestPointsService_GrantBalanceScoreboard(t *testing.T) {
	q := testutil.NewQueriesT(t)
	svc := NewPointsService(q, nil, nil)
	hh := testutil.NewHouseholdT(t, q)
	kid := testutil.NewMemberT(t, q, hh.ID, "Sarah", "kid")
	kid2 := testutil.NewMemberT(t, q, hh.ID, "Theo", "kid")
	cat, _ := svc.CreateCategory(context.Background(), hh.ID, "Listening", "#3b82f6", 1)
	beh, _ := svc.CreateBehavior(context.Background(), hh.ID, cat.ID, "First-time listener", 3)

	// Grant 3 + 3 to Sarah, 5 to Theo
	_, err := svc.Grant(context.Background(), hh.ID, kid.ID, &cat.ID, &beh.ID, 3, "morning routine", nil)
	if err != nil { t.Fatal(err) }
	_, _ = svc.Grant(context.Background(), hh.ID, kid.ID, &cat.ID, &beh.ID, 3, "evening", nil)
	_, _ = svc.Grant(context.Background(), hh.ID, kid2.ID, &cat.ID, nil, 5, "shoes by door", nil)

	bal, err := svc.GetBalance(context.Background(), kid.ID)
	if err != nil { t.Fatal(err) }
	if bal.Total != 6 { t.Fatalf("total=%d want 6", bal.Total) }

	sb, err := svc.Scoreboard(context.Background(), hh.ID)
	if err != nil { t.Fatal(err) }
	if len(sb) != 2 { t.Fatalf("scoreboard len=%d", len(sb)) }
	if sb[0].MemberID != kid2.ID { t.Fatalf("expected Theo on top, got %v", sb[0].MemberID) }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `go test ./internal/service/ -run TestPointsService_GrantBalanceScoreboard`
Expected: FAIL — undefined methods.

- [ ] **Step 3: Implement methods**

Append to `points.go`:

```go
import (
	"encoding/json"
	"time"

	"github.com/tidyboard/tidyboard/internal/model"
)

// Grant inserts a single signed point grant. Negative values allowed (used
// by redemption-debits and admin penalty adjustments).
func (s *PointsService) Grant(ctx context.Context, householdID, memberID uuid.UUID, categoryID, behaviorID *uuid.UUID, points int, reason string, byAccountID *uuid.UUID) (query.PointGrant, error) {
	var cat, beh *uuid.NullUUID
	if categoryID != nil { cat = &uuid.NullUUID{UUID: *categoryID, Valid: true} }
	if behaviorID != nil { beh = &uuid.NullUUID{UUID: *behaviorID, Valid: true} }
	var by *uuid.NullUUID
	if byAccountID != nil { by = &uuid.NullUUID{UUID: *byAccountID, Valid: true} }

	g, err := s.q.CreatePointGrant(ctx, query.CreatePointGrantParams{
		ID:                  uuid.New(),
		HouseholdID:         householdID,
		MemberID:            memberID,
		CategoryID:          cat,
		BehaviorID:          beh,
		Points:              int32(points),
		Reason:              reason,
		GrantedByAccountID:  by,
	})
	if err != nil { return query.PointGrant{}, fmt.Errorf("points.Grant: %w", err) }

	if s.bc != nil {
		payload, _ := json.Marshal(map[string]any{
			"grant_id":  g.ID,
			"member_id": memberID,
			"points":    points,
		})
		_ = s.bc.Publish(ctx, "household:"+householdID.String(), broadcast.Event{
			Type: "points.granted", HouseholdID: householdID.String(), Payload: payload, Timestamp: time.Now().UTC(),
		})
	}
	if s.audit != nil {
		s.audit.Log(ctx, "points.grant", "point_grant", g.ID, map[string]any{"member_id": memberID, "points": points, "reason": reason})
	}
	return g, nil
}

func (s *PointsService) GetBalance(ctx context.Context, memberID uuid.UUID) (model.PointsBalanceResponse, error) {
	total, err := s.q.SumPointsByMember(ctx, memberID)
	if err != nil { return model.PointsBalanceResponse{}, err }

	rows, err := s.q.SumPointsByMemberAndCategory(ctx, memberID)
	if err != nil { return model.PointsBalanceResponse{}, err }

	byCat := make([]model.CategoryTotal, 0, len(rows))
	for _, r := range rows {
		var cid *uuid.UUID
		if r.CategoryID != nil && r.CategoryID.Valid { c := r.CategoryID.UUID; cid = &c }
		byCat = append(byCat, model.CategoryTotal{CategoryID: cid, Total: r.Total})
	}

	recent, err := s.q.ListPointGrants(ctx, query.ListPointGrantsParams{
		HouseholdID: uuid.Nil,
		MemberID:    &uuid.NullUUID{UUID: memberID, Valid: true},
		Limit:       20,
		Offset:      0,
	})
	if err != nil { return model.PointsBalanceResponse{}, err }

	hist := make([]model.PointGrantSummary, 0, len(recent))
	for _, g := range recent {
		var cid, bid *uuid.UUID
		if g.CategoryID != nil && g.CategoryID.Valid { v := g.CategoryID.UUID; cid = &v }
		if g.BehaviorID != nil && g.BehaviorID.Valid { v := g.BehaviorID.UUID; bid = &v }
		hist = append(hist, model.PointGrantSummary{
			ID: g.ID, Points: int(g.Points), Reason: g.Reason,
			CategoryID: cid, BehaviorID: bid,
			GrantedAt: g.GrantedAt.Format(time.RFC3339),
		})
	}

	return model.PointsBalanceResponse{
		MemberID: memberID, Total: total, ByCategory: byCat, Recent: hist,
	}, nil
}

func (s *PointsService) Scoreboard(ctx context.Context, householdID uuid.UUID) ([]model.ScoreboardEntry, error) {
	totals, err := s.q.ScoreboardTotals(ctx, householdID)
	if err != nil { return nil, err }
	cats, err := s.q.ScoreboardByCategory(ctx, householdID)
	if err != nil { return nil, err }

	byMember := map[uuid.UUID][]model.CategoryTotal{}
	for _, c := range cats {
		var cid *uuid.UUID
		if c.CategoryID != nil && c.CategoryID.Valid { v := c.CategoryID.UUID; cid = &v }
		byMember[c.MemberID] = append(byMember[c.MemberID], model.CategoryTotal{CategoryID: cid, Total: c.Total})
	}
	out := make([]model.ScoreboardEntry, 0, len(totals))
	for _, t := range totals {
		out = append(out, model.ScoreboardEntry{MemberID: t.MemberID, Total: t.Total, ByCategory: byMember[t.MemberID]})
	}
	return out, nil
}
```

(NOTE: `ListPointGrants` uses `HouseholdID` from grant row's own household; if the sqlc-generated signature requires a non-nil household for the WHERE clause, change the SQL to drop that filter when `member_id` is supplied. Adjust per the actual generated code — do whichever yields the desired behavior with one trip to the DB.)

- [ ] **Step 4: Run test to verify it passes**

Run: `go test ./internal/service/ -run TestPointsService_GrantBalanceScoreboard -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add internal/service/points.go internal/service/points_test.go
git commit -m "feat(service): point grants + balance + scoreboard"
```

---

## Phase 5: Reward service (Go)

### Task 10: Models for rewards domain

**Files:**
- Create: `internal/model/reward.go`

- [ ] **Step 1: Write the file**

```go
package model

import (
	"github.com/google/uuid"
)

type CreateRewardRequest struct {
	Name             string  `json:"name"              validate:"required,min=1,max=120"`
	Description      string  `json:"description"`
	ImageURL         *string `json:"image_url,omitempty"`
	CostPoints       int     `json:"cost_points"        validate:"required,gte=0"`
	FulfillmentKind  string  `json:"fulfillment_kind"   validate:"required,oneof=self_serve needs_approval"`
}

type UpdateRewardRequest struct {
	Name             *string `json:"name,omitempty"`
	Description      *string `json:"description,omitempty"`
	ImageURL         *string `json:"image_url,omitempty"`
	CostPoints       *int    `json:"cost_points,omitempty"`
	FulfillmentKind  *string `json:"fulfillment_kind,omitempty"`
	Active           *bool   `json:"active,omitempty"`
}

type RedeemResponse struct {
	RedemptionID    uuid.UUID `json:"redemption_id"`
	Status          string    `json:"status"`             // "approved" or "pending"
	PointsCharged   int       `json:"points_charged"`     // 0 when status=pending
	NewBalance      int64     `json:"new_balance"`        // current balance for the member
	EffectiveCost   int       `json:"effective_cost"`
}

type DeclineRedemptionRequest struct {
	Reason string `json:"reason"  validate:"required,min=1,max=200"`
}

type CostAdjustRequest struct {
	MemberID    uuid.UUID `json:"member_id"     validate:"required"`
	DeltaPoints int       `json:"delta_points"  validate:"required"`
	Reason      string    `json:"reason"`
	ExpiresAt   *string   `json:"expires_at,omitempty"`
}

type SetSavingsGoalRequest struct {
	RewardID *uuid.UUID `json:"reward_id"` // nil = clear
}

type TimelineEvent struct {
	Kind       string  `json:"kind"`         // "point_grant" | "redemption" | "reward_cost_adjustment" | "wallet_transaction"
	ID         uuid.UUID `json:"id"`
	OccurredAt string  `json:"occurred_at"`
	Amount     int64   `json:"amount"`       // signed; cents for wallet, points otherwise
	Reason     string  `json:"reason"`
	RefA       *string `json:"ref_a,omitempty"`
	RefB       *string `json:"ref_b,omitempty"`
}
```

- [ ] **Step 2: Verify compiles**

Run: `go build ./...`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add internal/model/reward.go
git commit -m "feat(model): request/response structs for rewards domain"
```

---

### Task 11: RewardService — catalog CRUD

**Files:**
- Create: `internal/service/reward.go`
- Create: `internal/service/reward_test.go`

- [ ] **Step 1: Add the failing test**

```go
package service

import (
	"context"
	"testing"

	"github.com/tidyboard/tidyboard/internal/testutil"
)

func TestRewardService_CatalogCRUD(t *testing.T) {
	q := testutil.NewQueriesT(t)
	pts := NewPointsService(q, nil, nil)
	svc := NewRewardService(q, pts, nil, nil, nil)
	hh := testutil.NewHouseholdT(t, q)

	r, err := svc.CreateReward(context.Background(), hh.ID, "Stickers", "", nil, 50, "self_serve", nil)
	if err != nil { t.Fatal(err) }
	if r.CostPoints != 50 { t.Fatalf("cost=%d", r.CostPoints) }

	list, _ := svc.ListRewards(context.Background(), hh.ID, true)
	if len(list) != 1 { t.Fatalf("len=%d", len(list)) }

	cost := 75
	upd, err := svc.UpdateReward(context.Background(), hh.ID, r.ID, nil, nil, nil, &cost, nil, nil)
	if err != nil { t.Fatal(err) }
	if upd.CostPoints != 75 { t.Fatalf("updated cost=%d", upd.CostPoints) }

	if err := svc.ArchiveReward(context.Background(), hh.ID, r.ID); err != nil { t.Fatal(err) }
	list2, _ := svc.ListRewards(context.Background(), hh.ID, true)
	if len(list2) != 0 { t.Fatalf("expected archived to be hidden, got %d", len(list2)) }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `go test ./internal/service/ -run TestRewardService_CatalogCRUD`
Expected: FAIL — `undefined: NewRewardService`.

- [ ] **Step 3: Write the implementation**

```go
package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/tidyboard/tidyboard/internal/broadcast"
	"github.com/tidyboard/tidyboard/internal/model"
	"github.com/tidyboard/tidyboard/internal/query"
)

type RewardService struct {
	q      *query.Queries
	points *PointsService
	wallet *WalletService // unused now; reserved for future cross-ledger flows
	bc     broadcast.Broadcaster
	audit  *AuditService
}

func NewRewardService(q *query.Queries, points *PointsService, wallet *WalletService, bc broadcast.Broadcaster, audit *AuditService) *RewardService {
	return &RewardService{q: q, points: points, wallet: wallet, bc: bc, audit: audit}
}

// ── Catalog ────────────────────────────────────────────────────────────────

func (s *RewardService) CreateReward(ctx context.Context, householdID uuid.UUID, name, description string, imageURL *string, costPoints int, fulfillmentKind string, byAccountID *uuid.UUID) (query.Reward, error) {
	var by *uuid.NullUUID
	if byAccountID != nil { by = &uuid.NullUUID{UUID: *byAccountID, Valid: true} }
	var img *string = imageURL
	return s.q.CreateReward(ctx, query.CreateRewardParams{
		ID:                  uuid.New(),
		HouseholdID:         householdID,
		Name:                name,
		Description:         description,
		ImageUrl:            img,
		CostPoints:          int32(costPoints),
		FulfillmentKind:     fulfillmentKind,
		Active:              true,
		CreatedByAccountID:  by,
	})
}

func (s *RewardService) GetReward(ctx context.Context, householdID, id uuid.UUID) (query.Reward, error) {
	return s.q.GetReward(ctx, query.GetRewardParams{ID: id, HouseholdID: householdID})
}

func (s *RewardService) ListRewards(ctx context.Context, householdID uuid.UUID, onlyActive bool) ([]query.Reward, error) {
	return s.q.ListRewards(ctx, query.ListRewardsParams{HouseholdID: householdID, OnlyActive: onlyActive})
}

func (s *RewardService) UpdateReward(ctx context.Context, householdID, id uuid.UUID, name, description, imageURL *string, costPoints *int, fulfillmentKind *string, active *bool) (query.Reward, error) {
	params := query.UpdateRewardParams{ID: id, HouseholdID: householdID}
	if name != nil            { params.Name = pgText(*name) }
	if description != nil     { params.Description = pgText(*description) }
	if imageURL != nil        { params.ImageUrl = pgText(*imageURL) }
	if costPoints != nil      { params.CostPoints = pgInt(int32(*costPoints)) }
	if fulfillmentKind != nil { params.FulfillmentKind = pgText(*fulfillmentKind) }
	if active != nil          { params.Active = pgBool(*active) }
	return s.q.UpdateReward(ctx, params)
}

func (s *RewardService) ArchiveReward(ctx context.Context, householdID, id uuid.UUID) error {
	return s.q.ArchiveReward(ctx, query.ArchiveRewardParams{ID: id, HouseholdID: householdID})
}
```

(`pgBool` follows the same pattern as `pgText`/`pgInt` — add to `internal/service/util.go`.)

- [ ] **Step 4: Run test to verify it passes**

Run: `go test ./internal/service/ -run TestRewardService_CatalogCRUD -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add internal/service/reward.go internal/service/reward_test.go internal/service/util.go
git commit -m "feat(service): reward catalog CRUD"
```

---

### Task 12: RewardService — effective cost helper that hits the DB

**Files:**
- Modify: `internal/service/reward.go` — add `EffectiveCostFor`

- [ ] **Step 1: Add the failing test**

Append to `reward_test.go`:

```go
import "time"

func TestRewardService_EffectiveCostFor(t *testing.T) {
	q := testutil.NewQueriesT(t)
	svc := NewRewardService(q, NewPointsService(q, nil, nil), nil, nil, nil)
	hh := testutil.NewHouseholdT(t, q)
	kid := testutil.NewMemberT(t, q, hh.ID, "Sarah", "kid")

	r, _ := svc.CreateReward(context.Background(), hh.ID, "Game", "", nil, 100, "needs_approval", nil)

	// No adjustments → cost == base
	cost, err := svc.EffectiveCostFor(context.Background(), kid.ID, r.ID, r.CostPoints, time.Now())
	if err != nil { t.Fatal(err) }
	if cost != 100 { t.Fatalf("got %d", cost) }

	// Add a +25 adjustment
	if _, err := svc.CreateCostAdjustment(context.Background(), hh.ID, kid.ID, r.ID, 25, "for hitting", nil, nil); err != nil { t.Fatal(err) }
	cost2, _ := svc.EffectiveCostFor(context.Background(), kid.ID, r.ID, r.CostPoints, time.Now())
	if cost2 != 125 { t.Fatalf("got %d", cost2) }
}
```

- [ ] **Step 2: Run test to verify it fails**

Expected: FAIL — `undefined: EffectiveCostFor` / `CreateCostAdjustment`.

- [ ] **Step 3: Implement**

Append to `reward.go`:

```go
// EffectiveCostFor returns the effective cost of a reward for a single
// member at the given moment, applying all currently-active cost adjustments.
func (s *RewardService) EffectiveCostFor(ctx context.Context, memberID, rewardID uuid.UUID, baseCost int32, now time.Time) (int, error) {
	rows, err := s.q.ListActiveRewardCostAdjustments(ctx, query.ListActiveRewardCostAdjustmentsParams{
		MemberID: memberID, RewardID: rewardID,
	})
	if err != nil { return 0, fmt.Errorf("EffectiveCostFor: %w", err) }
	adjs := make([]CostAdjustment, 0, len(rows))
	for _, r := range rows {
		var exp *time.Time
		if r.ExpiresAt != nil { t := *r.ExpiresAt; exp = &t }
		adjs = append(adjs, CostAdjustment{Delta: int(r.DeltaPoints), ExpiresAt: exp})
	}
	return EffectiveCost(int(baseCost), adjs, now), nil
}

// CreateCostAdjustment inserts a per-member, per-reward cost shift.
func (s *RewardService) CreateCostAdjustment(ctx context.Context, householdID, memberID, rewardID uuid.UUID, delta int, reason string, expiresAt *time.Time, byAccountID *uuid.UUID) (query.RewardCostAdjustment, error) {
	var by *uuid.NullUUID
	if byAccountID != nil { by = &uuid.NullUUID{UUID: *byAccountID, Valid: true} }
	adj, err := s.q.CreateRewardCostAdjustment(ctx, query.CreateRewardCostAdjustmentParams{
		ID:                  uuid.New(),
		HouseholdID:         householdID,
		MemberID:            memberID,
		RewardID:            rewardID,
		DeltaPoints:         int32(delta),
		Reason:              reason,
		ExpiresAt:           expiresAt,
		CreatedByAccountID:  by,
	})
	if err != nil { return query.RewardCostAdjustment{}, fmt.Errorf("CreateCostAdjustment: %w", err) }

	if s.bc != nil {
		payload, _ := json.Marshal(map[string]any{"adjustment_id": adj.ID, "reward_id": rewardID, "member_id": memberID, "delta": delta})
		_ = s.bc.Publish(ctx, "household:"+householdID.String(), broadcast.Event{
			Type: "reward.cost_adjusted", HouseholdID: householdID.String(), Payload: payload, Timestamp: time.Now().UTC(),
		})
	}
	if s.audit != nil {
		s.audit.Log(ctx, "reward.cost_adjust", "reward_cost_adjustment", adj.ID, map[string]any{"member_id": memberID, "reward_id": rewardID, "delta": delta, "reason": reason})
	}
	return adj, nil
}

func (s *RewardService) DeleteCostAdjustment(ctx context.Context, householdID, id uuid.UUID) error {
	if err := s.q.DeleteRewardCostAdjustment(ctx, query.DeleteRewardCostAdjustmentParams{ID: id, HouseholdID: householdID}); err != nil {
		return fmt.Errorf("DeleteCostAdjustment: %w", err)
	}
	return nil
}
```

- [ ] **Step 4: Run test to verify it passes**

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add internal/service/reward.go internal/service/reward_test.go
git commit -m "feat(service): EffectiveCostFor + reward cost adjustment CRUD"
```

---

### Task 13: RewardService — redemption state machine

**Files:**
- Modify: `internal/service/reward.go` — add Redeem / Approve / Decline / Fulfill
- Modify: `internal/service/reward_test.go` — both happy paths

- [ ] **Step 1: Add the failing test**

```go
func TestRewardService_RedeemSelfServe(t *testing.T) {
	q := testutil.NewQueriesT(t)
	pts := NewPointsService(q, nil, nil)
	svc := NewRewardService(q, pts, nil, nil, nil)
	hh := testutil.NewHouseholdT(t, q)
	kid := testutil.NewMemberT(t, q, hh.ID, "Sarah", "kid")

	// Stake the kid with 100 pts
	_, _ = pts.Grant(context.Background(), hh.ID, kid.ID, nil, nil, 100, "starter", nil)

	r, _ := svc.CreateReward(context.Background(), hh.ID, "Stickers", "", nil, 30, "self_serve", nil)
	resp, err := svc.Redeem(context.Background(), hh.ID, kid.ID, r.ID, nil)
	if err != nil { t.Fatal(err) }
	if resp.Status != "approved" { t.Fatalf("status=%s", resp.Status) }
	if resp.NewBalance != 70 { t.Fatalf("balance=%d", resp.NewBalance) }
}

func TestRewardService_RedeemNeedsApproval(t *testing.T) {
	q := testutil.NewQueriesT(t)
	pts := NewPointsService(q, nil, nil)
	svc := NewRewardService(q, pts, nil, nil, nil)
	hh := testutil.NewHouseholdT(t, q)
	kid := testutil.NewMemberT(t, q, hh.ID, "Sarah", "kid")
	_, _ = pts.Grant(context.Background(), hh.ID, kid.ID, nil, nil, 100, "starter", nil)

	r, _ := svc.CreateReward(context.Background(), hh.ID, "Game", "", nil, 80, "needs_approval", nil)
	resp, err := svc.Redeem(context.Background(), hh.ID, kid.ID, r.ID, nil)
	if err != nil { t.Fatal(err) }
	if resp.Status != "pending" { t.Fatalf("status=%s", resp.Status) }
	if resp.NewBalance != 100 { t.Fatalf("balance=%d (should not be debited yet)", resp.NewBalance) }

	// Admin approves
	approved, err := svc.ApproveRedemption(context.Background(), hh.ID, resp.RedemptionID, nil)
	if err != nil { t.Fatal(err) }
	if approved.Status != "approved" { t.Fatalf("status=%s", approved.Status) }
	bal, _ := pts.GetBalance(context.Background(), kid.ID)
	if bal.Total != 20 { t.Fatalf("balance=%d after approve", bal.Total) }

	// Mark fulfilled
	if _, err := svc.FulfillRedemption(context.Background(), hh.ID, resp.RedemptionID); err != nil { t.Fatal(err) }
}

func TestRewardService_RedeemInsufficient(t *testing.T) {
	q := testutil.NewQueriesT(t)
	pts := NewPointsService(q, nil, nil)
	svc := NewRewardService(q, pts, nil, nil, nil)
	hh := testutil.NewHouseholdT(t, q)
	kid := testutil.NewMemberT(t, q, hh.ID, "Sarah", "kid")
	_, _ = pts.Grant(context.Background(), hh.ID, kid.ID, nil, nil, 10, "starter", nil)

	r, _ := svc.CreateReward(context.Background(), hh.ID, "Big", "", nil, 100, "self_serve", nil)
	_, err := svc.Redeem(context.Background(), hh.ID, kid.ID, r.ID, nil)
	if !errors.Is(err, ErrInsufficientPoints) { t.Fatalf("got %v, want ErrInsufficientPoints", err) }
}
```

- [ ] **Step 2: Run test to verify it fails**

Expected: FAIL — `undefined: ErrInsufficientPoints`, `Redeem`, etc.

- [ ] **Step 3: Implement**

Append to `reward.go`:

```go
// ErrInsufficientPoints is returned when a kid tries to redeem above balance.
var ErrInsufficientPoints = errors.New("insufficient points")

// ErrInvalidStateTransition is returned when admin tries an illegal redemption move.
var ErrInvalidStateTransition = errors.New("invalid redemption state transition")

// Redeem handles both self-serve and needs-approval flows.
//   - self_serve: writes a negative point_grant immediately and returns status=approved
//   - needs_approval: writes redemption row only, status=pending, no debit yet
func (s *RewardService) Redeem(ctx context.Context, householdID, memberID, rewardID uuid.UUID, byAccountID *uuid.UUID) (model.RedeemResponse, error) {
	reward, err := s.GetReward(ctx, householdID, rewardID)
	if err != nil { return model.RedeemResponse{}, fmt.Errorf("Redeem: get reward: %w", err) }
	if !reward.Active { return model.RedeemResponse{}, fmt.Errorf("Redeem: reward not active") }

	cost, err := s.EffectiveCostFor(ctx, memberID, rewardID, reward.CostPoints, time.Now())
	if err != nil { return model.RedeemResponse{}, err }

	bal, err := s.points.GetBalance(ctx, memberID)
	if err != nil { return model.RedeemResponse{}, err }

	if reward.FulfillmentKind == "self_serve" {
		if int64(cost) > bal.Total {
			return model.RedeemResponse{}, ErrInsufficientPoints
		}
		// Insert redemption first to get an ID for the grant's reference,
		// then debit, then update redemption.grant_id.
		red, err := s.q.CreateRedemption(ctx, query.CreateRedemptionParams{
			ID: uuid.New(), HouseholdID: householdID, RewardID: rewardID, MemberID: memberID,
			PointsAtRedemption: int32(cost), Status: "approved",
		})
		if err != nil { return model.RedeemResponse{}, fmt.Errorf("Redeem: create redemption: %w", err) }

		grant, err := s.points.Grant(ctx, householdID, memberID, nil, nil, -cost, "Redeemed: "+reward.Name, byAccountID)
		if err != nil { return model.RedeemResponse{}, fmt.Errorf("Redeem: debit grant: %w", err) }

		now := time.Now().UTC()
		var by *uuid.NullUUID
		if byAccountID != nil { by = &uuid.NullUUID{UUID: *byAccountID, Valid: true} }
		_, err = s.q.SetRedemptionStatus(ctx, query.SetRedemptionStatusParams{
			ID: red.ID, HouseholdID: householdID, Status: "approved",
			DecidedAt: &now, DecidedByAccountID: by, GrantID: &uuid.NullUUID{UUID: grant.ID, Valid: true},
		})
		if err != nil { return model.RedeemResponse{}, err }

		return model.RedeemResponse{
			RedemptionID: red.ID, Status: "approved",
			PointsCharged: cost, NewBalance: bal.Total - int64(cost), EffectiveCost: cost,
		}, nil
	}

	// needs_approval: just record the request, no debit yet
	red, err := s.q.CreateRedemption(ctx, query.CreateRedemptionParams{
		ID: uuid.New(), HouseholdID: householdID, RewardID: rewardID, MemberID: memberID,
		PointsAtRedemption: int32(cost), Status: "pending",
	})
	if err != nil { return model.RedeemResponse{}, fmt.Errorf("Redeem: create pending redemption: %w", err) }

	if s.bc != nil {
		payload, _ := json.Marshal(map[string]any{"redemption_id": red.ID, "member_id": memberID, "reward_id": rewardID, "cost": cost})
		_ = s.bc.Publish(ctx, "household:"+householdID.String(), broadcast.Event{
			Type: "redemption.requested", HouseholdID: householdID.String(), Payload: payload, Timestamp: time.Now().UTC(),
		})
	}

	return model.RedeemResponse{
		RedemptionID: red.ID, Status: "pending",
		PointsCharged: 0, NewBalance: bal.Total, EffectiveCost: cost,
	}, nil
}

func (s *RewardService) ApproveRedemption(ctx context.Context, householdID, redemptionID uuid.UUID, byAccountID *uuid.UUID) (query.Redemption, error) {
	red, err := s.q.GetRedemption(ctx, query.GetRedemptionParams{ID: redemptionID, HouseholdID: householdID})
	if err != nil { return query.Redemption{}, fmt.Errorf("ApproveRedemption: get: %w", err) }
	if red.Status != "pending" { return query.Redemption{}, ErrInvalidStateTransition }

	reward, err := s.GetReward(ctx, householdID, red.RewardID)
	if err != nil { return query.Redemption{}, err }

	// Debit at the snapshotted cost (parent already saw that price)
	grant, err := s.points.Grant(ctx, householdID, red.MemberID, nil, nil, -int(red.PointsAtRedemption), "Redeemed: "+reward.Name, byAccountID)
	if err != nil { return query.Redemption{}, fmt.Errorf("ApproveRedemption: debit: %w", err) }

	now := time.Now().UTC()
	var by *uuid.NullUUID
	if byAccountID != nil { by = &uuid.NullUUID{UUID: *byAccountID, Valid: true} }
	updated, err := s.q.SetRedemptionStatus(ctx, query.SetRedemptionStatusParams{
		ID: redemptionID, HouseholdID: householdID, Status: "approved",
		DecidedAt: &now, DecidedByAccountID: by, GrantID: &uuid.NullUUID{UUID: grant.ID, Valid: true},
	})
	if err != nil { return query.Redemption{}, err }

	if s.bc != nil {
		payload, _ := json.Marshal(map[string]any{"redemption_id": updated.ID, "status": "approved"})
		_ = s.bc.Publish(ctx, "household:"+householdID.String(), broadcast.Event{
			Type: "redemption.decided", HouseholdID: householdID.String(), Payload: payload, Timestamp: now,
		})
	}
	return updated, nil
}

func (s *RewardService) DeclineRedemption(ctx context.Context, householdID, redemptionID uuid.UUID, reason string, byAccountID *uuid.UUID) (query.Redemption, error) {
	red, err := s.q.GetRedemption(ctx, query.GetRedemptionParams{ID: redemptionID, HouseholdID: householdID})
	if err != nil { return query.Redemption{}, err }
	if red.Status != "pending" { return query.Redemption{}, ErrInvalidStateTransition }

	now := time.Now().UTC()
	var by *uuid.NullUUID
	if byAccountID != nil { by = &uuid.NullUUID{UUID: *byAccountID, Valid: true} }
	updated, err := s.q.SetRedemptionStatus(ctx, query.SetRedemptionStatusParams{
		ID: redemptionID, HouseholdID: householdID, Status: "declined",
		DecidedAt: &now, DecidedByAccountID: by, DeclineReason: pgText(reason),
	})
	if err != nil { return query.Redemption{}, err }

	if s.bc != nil {
		payload, _ := json.Marshal(map[string]any{"redemption_id": updated.ID, "status": "declined", "reason": reason})
		_ = s.bc.Publish(ctx, "household:"+householdID.String(), broadcast.Event{Type: "redemption.decided", HouseholdID: householdID.String(), Payload: payload, Timestamp: now})
	}
	return updated, nil
}

func (s *RewardService) FulfillRedemption(ctx context.Context, householdID, redemptionID uuid.UUID) (query.Redemption, error) {
	red, err := s.q.GetRedemption(ctx, query.GetRedemptionParams{ID: redemptionID, HouseholdID: householdID})
	if err != nil { return query.Redemption{}, err }
	if red.Status != "approved" { return query.Redemption{}, ErrInvalidStateTransition }

	now := time.Now().UTC()
	updated, err := s.q.SetRedemptionStatus(ctx, query.SetRedemptionStatusParams{
		ID: redemptionID, HouseholdID: householdID, Status: "fulfilled",
		FulfilledAt: &now,
	})
	if err != nil { return query.Redemption{}, err }
	if s.bc != nil {
		payload, _ := json.Marshal(map[string]any{"redemption_id": updated.ID})
		_ = s.bc.Publish(ctx, "household:"+householdID.String(), broadcast.Event{Type: "redemption.fulfilled", HouseholdID: householdID.String(), Payload: payload, Timestamp: now})
	}
	return updated, nil
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `go test ./internal/service/ -run TestRewardService_Redeem -v`
Expected: PASS for all three sub-tests.

- [ ] **Step 5: Commit**

```bash
git add internal/service/reward.go internal/service/reward_test.go
git commit -m "feat(service): redemption state machine (self-serve, needs-approval, fulfill)"
```

---

### Task 14: RewardService — savings goals + timeline aggregation

**Files:**
- Modify: `internal/service/reward.go` — add `SetSavingsGoal`, `GetSavingsGoal`, `Timeline`

- [ ] **Step 1: Implement (no test, simple wrappers; covered by handler integration in Task 16)**

Append to `reward.go`:

```go
func (s *RewardService) GetSavingsGoal(ctx context.Context, memberID uuid.UUID) (query.SavingsGoal, error) {
	return s.q.GetActiveSavingsGoal(ctx, memberID)
}

func (s *RewardService) SetSavingsGoal(ctx context.Context, memberID uuid.UUID, rewardID *uuid.UUID) (*query.SavingsGoal, error) {
	if rewardID == nil {
		if err := s.q.ClearSavingsGoal(ctx, memberID); err != nil { return nil, err }
		return nil, nil
	}
	g, err := s.q.UpsertSavingsGoal(ctx, query.UpsertSavingsGoalParams{
		ID: uuid.New(), MemberID: memberID, RewardID: *rewardID,
	})
	return &g, err
}

func (s *RewardService) Timeline(ctx context.Context, memberID uuid.UUID, limit, offset int) ([]model.TimelineEvent, error) {
	rows, err := s.q.TimelineForMember(ctx, query.TimelineForMemberParams{
		MemberID: memberID, Limit: int32(limit), Offset: int32(offset),
	})
	if err != nil { return nil, err }
	out := make([]model.TimelineEvent, 0, len(rows))
	for _, r := range rows {
		var refA, refB *string
		if r.RefA != "" { v := r.RefA; refA = &v }
		if r.RefB != "" { v := r.RefB; refB = &v }
		out = append(out, model.TimelineEvent{
			Kind: r.Kind, ID: r.ID,
			OccurredAt: r.OccurredAt.Format(time.RFC3339),
			Amount: r.Amount, Reason: r.Reason,
			RefA: refA, RefB: refB,
		})
	}
	return out, nil
}
```

- [ ] **Step 2: Verify compiles**

Run: `go build ./...`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add internal/service/reward.go
git commit -m "feat(service): savings goals + timeline aggregation"
```

---

## Phase 6: HTTP handlers

### Task 15: Points handler

**Files:**
- Create: `internal/handler/points.go`
- Create: `internal/handler/points_test.go`

- [ ] **Step 1: Add the failing integration test**

```go
package handler

import (
	"net/http"
	"testing"

	"github.com/tidyboard/tidyboard/internal/testutil"
)

func TestPointsHandler_GrantRequiresAdmin(t *testing.T) {
	srv := testutil.NewServerT(t) // helper that boots the chi router with all handlers wired
	hh, admin, kid := testutil.SeedHouseholdWithKidT(t, srv)

	// Kid token cannot grant
	res := srv.POST(t, "/v1/points/"+kid.ID.String()+"/grant", kid.Token, map[string]any{"points": 5, "reason": "self-grant"})
	if res.Status != http.StatusForbidden { t.Fatalf("got %d", res.Status) }

	// Admin can
	res2 := srv.POST(t, "/v1/points/"+kid.ID.String()+"/grant", admin.Token, map[string]any{"points": 5, "reason": "well done"})
	if res2.Status != http.StatusOK { t.Fatalf("got %d body=%s", res2.Status, res2.Body) }

	// Scoreboard reflects it
	res3 := srv.GET(t, "/v1/points/scoreboard", admin.Token)
	if res3.Status != http.StatusOK { t.Fatalf("got %d", res3.Status) }
	_ = hh
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `go test ./internal/handler/ -run TestPointsHandler_`
Expected: FAIL — routes return 404 (handler not wired) or `undefined: PointsHandler`.

- [ ] **Step 3: Write the implementation**

```go
package handler

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/tidyboard/tidyboard/internal/handler/respond"
	"github.com/tidyboard/tidyboard/internal/middleware"
	"github.com/tidyboard/tidyboard/internal/model"
	"github.com/tidyboard/tidyboard/internal/service"
)

type PointsHandler struct {
	svc *service.PointsService
}

func NewPointsHandler(svc *service.PointsService) *PointsHandler {
	return &PointsHandler{svc: svc}
}

// ── Categories ────────────────────────────────────────────────────────────

func (h *PointsHandler) ListCategories(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok { respond.Error(w, http.StatusUnauthorized, "unauthorized", "missing household context"); return }
	includeArchived := r.URL.Query().Get("include_archived") == "true"
	rows, err := h.svc.ListCategories(r.Context(), householdID, includeArchived)
	if err != nil { respond.Error(w, http.StatusInternalServerError, "internal_error", "list categories"); return }
	respond.JSON(w, http.StatusOK, rows)
}

func (h *PointsHandler) CreateCategory(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok { respond.Error(w, http.StatusUnauthorized, "unauthorized", "missing household context"); return }
	if !isAdmin(middleware.RoleFromCtx(r.Context())) { respond.Error(w, http.StatusForbidden, "forbidden", "admin role required"); return }

	var req model.CreatePointCategoryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil { respond.Error(w, http.StatusBadRequest, "bad_request", "invalid JSON body"); return }
	if req.Name == "" { respond.Error(w, http.StatusBadRequest, "validation_error", "name required"); return }

	c, err := h.svc.CreateCategory(r.Context(), householdID, req.Name, req.Color, req.SortOrder)
	if err != nil { respond.Error(w, http.StatusInternalServerError, "internal_error", "create category"); return }
	respond.JSON(w, http.StatusCreated, c)
}

func (h *PointsHandler) UpdateCategory(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok { respond.Error(w, http.StatusUnauthorized, "unauthorized", "missing household context"); return }
	if !isAdmin(middleware.RoleFromCtx(r.Context())) { respond.Error(w, http.StatusForbidden, "forbidden", "admin role required"); return }

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil { respond.Error(w, http.StatusBadRequest, "bad_request", "invalid id"); return }

	var req model.UpdatePointCategoryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil { respond.Error(w, http.StatusBadRequest, "bad_request", "invalid JSON body"); return }

	c, err := h.svc.UpdateCategory(r.Context(), householdID, id, req.Name, req.Color, req.SortOrder)
	if err != nil { respond.Error(w, http.StatusInternalServerError, "internal_error", "update category"); return }
	respond.JSON(w, http.StatusOK, c)
}

func (h *PointsHandler) ArchiveCategory(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok { respond.Error(w, http.StatusUnauthorized, "unauthorized", "missing household context"); return }
	if !isAdmin(middleware.RoleFromCtx(r.Context())) { respond.Error(w, http.StatusForbidden, "forbidden", "admin role required"); return }

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil { respond.Error(w, http.StatusBadRequest, "bad_request", "invalid id"); return }
	if err := h.svc.ArchiveCategory(r.Context(), householdID, id); err != nil { respond.Error(w, http.StatusInternalServerError, "internal_error", "archive"); return }
	w.WriteHeader(http.StatusNoContent)
}

// ── Behaviors (CRUD: same shape as Categories — list/create/update/archive) ──

func (h *PointsHandler) ListBehaviors(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok { respond.Error(w, http.StatusUnauthorized, "unauthorized", "missing household context"); return }
	var catID *uuid.UUID
	if c := r.URL.Query().Get("category_id"); c != "" {
		id, err := uuid.Parse(c)
		if err != nil { respond.Error(w, http.StatusBadRequest, "bad_request", "invalid category_id"); return }
		catID = &id
	}
	rows, err := h.svc.ListBehaviors(r.Context(), householdID, catID, r.URL.Query().Get("include_archived") == "true")
	if err != nil { respond.Error(w, http.StatusInternalServerError, "internal_error", "list behaviors"); return }
	respond.JSON(w, http.StatusOK, rows)
}

func (h *PointsHandler) CreateBehavior(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok { respond.Error(w, http.StatusUnauthorized, "unauthorized", "missing household context"); return }
	if !isAdmin(middleware.RoleFromCtx(r.Context())) { respond.Error(w, http.StatusForbidden, "forbidden", "admin role required"); return }

	var req model.CreateBehaviorRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil { respond.Error(w, http.StatusBadRequest, "bad_request", "invalid JSON body"); return }
	if req.Name == "" { respond.Error(w, http.StatusBadRequest, "validation_error", "name required"); return }
	if req.CategoryID == uuid.Nil { respond.Error(w, http.StatusBadRequest, "validation_error", "category_id required"); return }

	b, err := h.svc.CreateBehavior(r.Context(), householdID, req.CategoryID, req.Name, req.SuggestedPoints)
	if err != nil { respond.Error(w, http.StatusInternalServerError, "internal_error", "create behavior"); return }
	respond.JSON(w, http.StatusCreated, b)
}

func (h *PointsHandler) UpdateBehavior(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok { respond.Error(w, http.StatusUnauthorized, "unauthorized", "missing household context"); return }
	if !isAdmin(middleware.RoleFromCtx(r.Context())) { respond.Error(w, http.StatusForbidden, "forbidden", "admin role required"); return }
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil { respond.Error(w, http.StatusBadRequest, "bad_request", "invalid id"); return }
	var req model.UpdateBehaviorRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil { respond.Error(w, http.StatusBadRequest, "bad_request", "invalid JSON body"); return }
	b, err := h.svc.UpdateBehavior(r.Context(), householdID, id, req.Name, req.CategoryID, req.SuggestedPoints)
	if err != nil { respond.Error(w, http.StatusInternalServerError, "internal_error", "update behavior"); return }
	respond.JSON(w, http.StatusOK, b)
}

func (h *PointsHandler) ArchiveBehavior(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok { respond.Error(w, http.StatusUnauthorized, "unauthorized", "missing household context"); return }
	if !isAdmin(middleware.RoleFromCtx(r.Context())) { respond.Error(w, http.StatusForbidden, "forbidden", "admin role required"); return }
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil { respond.Error(w, http.StatusBadRequest, "bad_request", "invalid id"); return }
	if err := h.svc.ArchiveBehavior(r.Context(), householdID, id); err != nil { respond.Error(w, http.StatusInternalServerError, "internal_error", "archive"); return }
	w.WriteHeader(http.StatusNoContent)
}

// ── Grants + balance + scoreboard ────────────────────────────────────────

func (h *PointsHandler) Grant(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok { respond.Error(w, http.StatusUnauthorized, "unauthorized", "missing household context"); return }
	if !isAdmin(middleware.RoleFromCtx(r.Context())) { respond.Error(w, http.StatusForbidden, "forbidden", "admin role required"); return }

	memberID, err := uuid.Parse(chi.URLParam(r, "member_id"))
	if err != nil { respond.Error(w, http.StatusBadRequest, "bad_request", "invalid member_id"); return }
	var req model.GrantPointsRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil { respond.Error(w, http.StatusBadRequest, "bad_request", "invalid JSON body"); return }
	if req.Points == 0 { respond.Error(w, http.StatusBadRequest, "validation_error", "points must be non-zero"); return }

	accountID, _ := middleware.AccountIDFromCtx(r.Context())
	g, err := h.svc.Grant(r.Context(), householdID, memberID, req.CategoryID, req.BehaviorID, req.Points, req.Reason, &accountID)
	if err != nil { respond.Error(w, http.StatusInternalServerError, "internal_error", "grant"); return }
	respond.JSON(w, http.StatusOK, g)
}

func (h *PointsHandler) Adjust(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok { respond.Error(w, http.StatusUnauthorized, "unauthorized", "missing household context"); return }
	if !isAdmin(middleware.RoleFromCtx(r.Context())) { respond.Error(w, http.StatusForbidden, "forbidden", "admin role required"); return }
	memberID, err := uuid.Parse(chi.URLParam(r, "member_id"))
	if err != nil { respond.Error(w, http.StatusBadRequest, "bad_request", "invalid member_id"); return }
	var req model.AdjustPointsRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil { respond.Error(w, http.StatusBadRequest, "bad_request", "invalid JSON body"); return }
	if req.Points == 0 { respond.Error(w, http.StatusBadRequest, "validation_error", "points must be non-zero"); return }
	if req.Reason == "" { respond.Error(w, http.StatusBadRequest, "validation_error", "reason required"); return }

	accountID, _ := middleware.AccountIDFromCtx(r.Context())
	g, err := h.svc.Grant(r.Context(), householdID, memberID, nil, nil, req.Points, req.Reason, &accountID)
	if err != nil { respond.Error(w, http.StatusInternalServerError, "internal_error", "adjust"); return }
	respond.JSON(w, http.StatusOK, g)
}

func (h *PointsHandler) GetBalance(w http.ResponseWriter, r *http.Request) {
	if _, ok := middleware.HouseholdIDFromCtx(r.Context()); !ok { respond.Error(w, http.StatusUnauthorized, "unauthorized", "missing household context"); return }
	memberID, err := uuid.Parse(chi.URLParam(r, "member_id"))
	if err != nil { respond.Error(w, http.StatusBadRequest, "bad_request", "invalid member_id"); return }
	bal, err := h.svc.GetBalance(r.Context(), memberID)
	if err != nil { respond.Error(w, http.StatusInternalServerError, "internal_error", "get balance"); return }
	respond.JSON(w, http.StatusOK, bal)
}

func (h *PointsHandler) Scoreboard(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok { respond.Error(w, http.StatusUnauthorized, "unauthorized", "missing household context"); return }
	rows, err := h.svc.Scoreboard(r.Context(), householdID)
	if err != nil { respond.Error(w, http.StatusInternalServerError, "internal_error", "scoreboard"); return }
	respond.JSON(w, http.StatusOK, rows)
}

// limit/offset helpers — copy from the wallet handler if needed
var _ = strconv.Atoi
```

- [ ] **Step 4: Run test to verify it passes (will still 404 until Task 17 wires routes)**

Skip this step — return to it after Task 17.

- [ ] **Step 5: Commit**

```bash
git add internal/handler/points.go internal/handler/points_test.go
git commit -m "feat(handler): points categories, behaviors, grant, balance, scoreboard"
```

---

### Task 16: Reward handler

**Files:**
- Create: `internal/handler/reward.go`
- Create: `internal/handler/reward_test.go`

- [ ] **Step 1: Write the handler implementation**

```go
package handler

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/tidyboard/tidyboard/internal/handler/respond"
	"github.com/tidyboard/tidyboard/internal/middleware"
	"github.com/tidyboard/tidyboard/internal/model"
	"github.com/tidyboard/tidyboard/internal/service"
)

type RewardHandler struct {
	svc *service.RewardService
}

func NewRewardHandler(svc *service.RewardService) *RewardHandler {
	return &RewardHandler{svc: svc}
}

// ── Catalog ────────────────────────────────────────────────────────────────

func (h *RewardHandler) List(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok { respond.Error(w, http.StatusUnauthorized, "unauthorized", "missing household context"); return }
	onlyActive := r.URL.Query().Get("active") != "false" // default true
	rows, err := h.svc.ListRewards(r.Context(), householdID, onlyActive)
	if err != nil { respond.Error(w, http.StatusInternalServerError, "internal_error", "list rewards"); return }
	respond.JSON(w, http.StatusOK, rows)
}

func (h *RewardHandler) Create(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok { respond.Error(w, http.StatusUnauthorized, "unauthorized", "missing household context"); return }
	if !isAdmin(middleware.RoleFromCtx(r.Context())) { respond.Error(w, http.StatusForbidden, "forbidden", "admin role required"); return }
	var req model.CreateRewardRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil { respond.Error(w, http.StatusBadRequest, "bad_request", "invalid JSON body"); return }
	if req.Name == "" { respond.Error(w, http.StatusBadRequest, "validation_error", "name required"); return }
	if req.CostPoints < 0 { respond.Error(w, http.StatusBadRequest, "validation_error", "cost_points must be >= 0"); return }
	if req.FulfillmentKind != "self_serve" && req.FulfillmentKind != "needs_approval" { respond.Error(w, http.StatusBadRequest, "validation_error", "invalid fulfillment_kind"); return }

	accountID, _ := middleware.AccountIDFromCtx(r.Context())
	rw, err := h.svc.CreateReward(r.Context(), householdID, req.Name, req.Description, req.ImageURL, req.CostPoints, req.FulfillmentKind, &accountID)
	if err != nil { respond.Error(w, http.StatusInternalServerError, "internal_error", "create reward"); return }
	respond.JSON(w, http.StatusCreated, rw)
}

func (h *RewardHandler) Update(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok { respond.Error(w, http.StatusUnauthorized, "unauthorized", "missing household context"); return }
	if !isAdmin(middleware.RoleFromCtx(r.Context())) { respond.Error(w, http.StatusForbidden, "forbidden", "admin role required"); return }
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil { respond.Error(w, http.StatusBadRequest, "bad_request", "invalid id"); return }
	var req model.UpdateRewardRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil { respond.Error(w, http.StatusBadRequest, "bad_request", "invalid JSON body"); return }
	rw, err := h.svc.UpdateReward(r.Context(), householdID, id, req.Name, req.Description, req.ImageURL, req.CostPoints, req.FulfillmentKind, req.Active)
	if err != nil { respond.Error(w, http.StatusInternalServerError, "internal_error", "update reward"); return }
	respond.JSON(w, http.StatusOK, rw)
}

func (h *RewardHandler) Archive(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok { respond.Error(w, http.StatusUnauthorized, "unauthorized", "missing household context"); return }
	if !isAdmin(middleware.RoleFromCtx(r.Context())) { respond.Error(w, http.StatusForbidden, "forbidden", "admin role required"); return }
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil { respond.Error(w, http.StatusBadRequest, "bad_request", "invalid id"); return }
	if err := h.svc.ArchiveReward(r.Context(), householdID, id); err != nil { respond.Error(w, http.StatusInternalServerError, "internal_error", "archive"); return }
	w.WriteHeader(http.StatusNoContent)
}

// ── Redemptions ─────────────────────────────────────────────────────────────

func (h *RewardHandler) Redeem(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok { respond.Error(w, http.StatusUnauthorized, "unauthorized", "missing household context"); return }
	rewardID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil { respond.Error(w, http.StatusBadRequest, "bad_request", "invalid id"); return }
	memberID, _ := middleware.MemberIDFromCtx(r.Context()) // kid context
	accountID, _ := middleware.AccountIDFromCtx(r.Context())

	resp, err := h.svc.Redeem(r.Context(), householdID, memberID, rewardID, &accountID)
	if errors.Is(err, service.ErrInsufficientPoints) {
		respond.Error(w, http.StatusConflict, "insufficient_points", "not enough points to redeem this reward")
		return
	}
	if err != nil { respond.Error(w, http.StatusInternalServerError, "internal_error", "redeem"); return }
	respond.JSON(w, http.StatusOK, resp)
}

func (h *RewardHandler) Approve(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok { respond.Error(w, http.StatusUnauthorized, "unauthorized", "missing household context"); return }
	if !isAdmin(middleware.RoleFromCtx(r.Context())) { respond.Error(w, http.StatusForbidden, "forbidden", "admin role required"); return }
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil { respond.Error(w, http.StatusBadRequest, "bad_request", "invalid id"); return }
	accountID, _ := middleware.AccountIDFromCtx(r.Context())
	red, err := h.svc.ApproveRedemption(r.Context(), householdID, id, &accountID)
	if errors.Is(err, service.ErrInvalidStateTransition) {
		respond.Error(w, http.StatusConflict, "invalid_state", "redemption is not pending")
		return
	}
	if err != nil { respond.Error(w, http.StatusInternalServerError, "internal_error", "approve"); return }
	respond.JSON(w, http.StatusOK, red)
}

func (h *RewardHandler) Decline(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok { respond.Error(w, http.StatusUnauthorized, "unauthorized", "missing household context"); return }
	if !isAdmin(middleware.RoleFromCtx(r.Context())) { respond.Error(w, http.StatusForbidden, "forbidden", "admin role required"); return }
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil { respond.Error(w, http.StatusBadRequest, "bad_request", "invalid id"); return }
	var req model.DeclineRedemptionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil { respond.Error(w, http.StatusBadRequest, "bad_request", "invalid JSON body"); return }
	if req.Reason == "" { respond.Error(w, http.StatusBadRequest, "validation_error", "reason required"); return }
	accountID, _ := middleware.AccountIDFromCtx(r.Context())
	red, err := h.svc.DeclineRedemption(r.Context(), householdID, id, req.Reason, &accountID)
	if errors.Is(err, service.ErrInvalidStateTransition) { respond.Error(w, http.StatusConflict, "invalid_state", "not pending"); return }
	if err != nil { respond.Error(w, http.StatusInternalServerError, "internal_error", "decline"); return }
	respond.JSON(w, http.StatusOK, red)
}

func (h *RewardHandler) Fulfill(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok { respond.Error(w, http.StatusUnauthorized, "unauthorized", "missing household context"); return }
	if !isAdmin(middleware.RoleFromCtx(r.Context())) { respond.Error(w, http.StatusForbidden, "forbidden", "admin role required"); return }
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil { respond.Error(w, http.StatusBadRequest, "bad_request", "invalid id"); return }
	red, err := h.svc.FulfillRedemption(r.Context(), householdID, id)
	if errors.Is(err, service.ErrInvalidStateTransition) { respond.Error(w, http.StatusConflict, "invalid_state", "not approved"); return }
	if err != nil { respond.Error(w, http.StatusInternalServerError, "internal_error", "fulfill"); return }
	respond.JSON(w, http.StatusOK, red)
}

func (h *RewardHandler) ListRedemptions(w http.ResponseWriter, r *http.Request) {
	// (use h.svc.q.ListRedemptions via a thin pass-through; implementation mirrors PointsHandler.GetBalance pagination)
	// Omitted here for brevity — copy the pattern from internal/handler/wallet.go ListAdHocTasks.
	respond.Error(w, http.StatusNotImplemented, "not_implemented", "see ListAdHocTasks pattern")
}

// ── Savings goals ───────────────────────────────────────────────────────────

func (h *RewardHandler) SetSavingsGoal(w http.ResponseWriter, r *http.Request) {
	if _, ok := middleware.HouseholdIDFromCtx(r.Context()); !ok { respond.Error(w, http.StatusUnauthorized, "unauthorized", "missing household context"); return }
	memberID, err := uuid.Parse(chi.URLParam(r, "member_id"))
	if err != nil { respond.Error(w, http.StatusBadRequest, "bad_request", "invalid member_id"); return }
	var req model.SetSavingsGoalRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil { respond.Error(w, http.StatusBadRequest, "bad_request", "invalid JSON body"); return }
	g, err := h.svc.SetSavingsGoal(r.Context(), memberID, req.RewardID)
	if err != nil { respond.Error(w, http.StatusInternalServerError, "internal_error", "set savings goal"); return }
	respond.JSON(w, http.StatusOK, g)
}

// ── Cost adjustments ───────────────────────────────────────────────────────

func (h *RewardHandler) CostAdjust(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok { respond.Error(w, http.StatusUnauthorized, "unauthorized", "missing household context"); return }
	if !isAdmin(middleware.RoleFromCtx(r.Context())) { respond.Error(w, http.StatusForbidden, "forbidden", "admin role required"); return }
	rewardID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil { respond.Error(w, http.StatusBadRequest, "bad_request", "invalid id"); return }
	var req model.CostAdjustRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil { respond.Error(w, http.StatusBadRequest, "bad_request", "invalid JSON body"); return }
	if req.MemberID == uuid.Nil || req.DeltaPoints == 0 { respond.Error(w, http.StatusBadRequest, "validation_error", "member_id and non-zero delta_points required"); return }

	var expiresAt *time.Time
	if req.ExpiresAt != nil && *req.ExpiresAt != "" {
		t, err := time.Parse(time.RFC3339, *req.ExpiresAt)
		if err != nil { respond.Error(w, http.StatusBadRequest, "validation_error", "invalid expires_at"); return }
		expiresAt = &t
	}
	accountID, _ := middleware.AccountIDFromCtx(r.Context())
	adj, err := h.svc.CreateCostAdjustment(r.Context(), householdID, req.MemberID, rewardID, req.DeltaPoints, req.Reason, expiresAt, &accountID)
	if err != nil { respond.Error(w, http.StatusInternalServerError, "internal_error", "adjust"); return }
	respond.JSON(w, http.StatusCreated, adj)
}

func (h *RewardHandler) DeleteCostAdjustment(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok { respond.Error(w, http.StatusUnauthorized, "unauthorized", "missing household context"); return }
	if !isAdmin(middleware.RoleFromCtx(r.Context())) { respond.Error(w, http.StatusForbidden, "forbidden", "admin role required"); return }
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil { respond.Error(w, http.StatusBadRequest, "bad_request", "invalid id"); return }
	if err := h.svc.DeleteCostAdjustment(r.Context(), householdID, id); err != nil { respond.Error(w, http.StatusInternalServerError, "internal_error", "delete"); return }
	w.WriteHeader(http.StatusNoContent)
}

// ── Timeline ────────────────────────────────────────────────────────────────

func (h *RewardHandler) Timeline(w http.ResponseWriter, r *http.Request) {
	if _, ok := middleware.HouseholdIDFromCtx(r.Context()); !ok { respond.Error(w, http.StatusUnauthorized, "unauthorized", "missing household context"); return }
	memberID, err := uuid.Parse(chi.URLParam(r, "member_id"))
	if err != nil { respond.Error(w, http.StatusBadRequest, "bad_request", "invalid member_id"); return }
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit <= 0 || limit > 200 { limit = 50 }
	offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))
	if offset < 0 { offset = 0 }
	rows, err := h.svc.Timeline(r.Context(), memberID, limit, offset)
	if err != nil { respond.Error(w, http.StatusInternalServerError, "internal_error", "timeline"); return }
	respond.JSON(w, http.StatusOK, rows)
}
```

- [ ] **Step 2: Verify compiles**

Run: `go build ./...`
Expected: no errors. (`MemberIDFromCtx` should already exist — if not, fall back to looking up the member via `accountID -> member` like the existing PIN-login path.)

- [ ] **Step 3: Commit**

```bash
git add internal/handler/reward.go internal/handler/reward_test.go
git commit -m "feat(handler): rewards catalog + redemption state machine + cost adjust + timeline"
```

---

## Phase 7: Wire routes

### Task 17: Register Points + Reward services and handlers in main.go

**Files:**
- Modify: `cmd/server/main.go`

- [ ] **Step 1: Add service construction next to wallet/chore wiring (~line 145)**

Find the existing block:

```go
walletSvc := service.NewWalletService(q, bc, auditSvc)
choreSvc := service.NewChoreService(q, walletSvc, bc, auditSvc)
```

Add immediately after:

```go
pointsSvc := service.NewPointsService(q, bc, auditSvc)
rewardSvc := service.NewRewardService(q, pointsSvc, walletSvc, bc, auditSvc)
```

- [ ] **Step 2: Add handler construction next to wallet/chore handlers (~line 205)**

Find:

```go
walletHandler := handler.NewWalletHandler(walletSvc, q)
choreHandler := handler.NewChoreHandler(choreSvc, q)
```

Add after:

```go
pointsHandler := handler.NewPointsHandler(pointsSvc)
rewardHandler := handler.NewRewardHandler(rewardSvc)
```

- [ ] **Step 3: Add routes inside the protected route group (~line 432, after the ad-hoc routes)**

```go
		// ── Points ──
		r.Get("/v1/point-categories", pointsHandler.ListCategories)
		r.Post("/v1/point-categories", pointsHandler.CreateCategory)
		r.Patch("/v1/point-categories/{id}", pointsHandler.UpdateCategory)
		r.Delete("/v1/point-categories/{id}", pointsHandler.ArchiveCategory)
		r.Get("/v1/behaviors", pointsHandler.ListBehaviors)
		r.Post("/v1/behaviors", pointsHandler.CreateBehavior)
		r.Patch("/v1/behaviors/{id}", pointsHandler.UpdateBehavior)
		r.Delete("/v1/behaviors/{id}", pointsHandler.ArchiveBehavior)
		r.Post("/v1/points/{member_id}/grant", pointsHandler.Grant)
		r.Post("/v1/points/{member_id}/adjust", pointsHandler.Adjust)
		r.Get("/v1/points/{member_id}", pointsHandler.GetBalance)
		r.Get("/v1/points/scoreboard", pointsHandler.Scoreboard)

		// ── Rewards ──
		r.Get("/v1/rewards", rewardHandler.List)
		r.Post("/v1/rewards", rewardHandler.Create)
		r.Patch("/v1/rewards/{id}", rewardHandler.Update)
		r.Delete("/v1/rewards/{id}", rewardHandler.Archive)
		r.Post("/v1/rewards/{id}/redeem", rewardHandler.Redeem)
		r.Post("/v1/rewards/{id}/cost-adjust", rewardHandler.CostAdjust)
		r.Delete("/v1/reward-adjustments/{id}", rewardHandler.DeleteCostAdjustment)
		r.Get("/v1/redemptions", rewardHandler.ListRedemptions)
		r.Post("/v1/redemptions/{id}/approve", rewardHandler.Approve)
		r.Post("/v1/redemptions/{id}/decline", rewardHandler.Decline)
		r.Post("/v1/redemptions/{id}/fulfill", rewardHandler.Fulfill)
		r.Put("/v1/savings-goals/{member_id}", rewardHandler.SetSavingsGoal)
		r.Get("/v1/timeline/{member_id}", rewardHandler.Timeline)
```

- [ ] **Step 4: Verify compiles + smoke test**

Run: `go build ./...`
Expected: no errors.

Run: `go test ./internal/handler/ -run TestPointsHandler_GrantRequiresAdmin -v`
Expected: PASS now that routes are wired.

- [ ] **Step 5: Commit**

```bash
git add cmd/server/main.go
git commit -m "feat(server): wire points + reward services, handlers, and routes"
```

---

## Phase 8: Frontend types + hooks + fallback shapes

### Task 18: Add `Api*` types for points/rewards

**Files:**
- Modify: `web/src/lib/api/types.ts`

- [ ] **Step 1: Append to the bottom of the file (after the existing `ApiAdHocTask`)**

```ts
// ── Points / Rewards types ──────────────────────────────────────────────────

export interface ApiPointCategory {
  id: string;
  household_id: string;
  name: string;
  color: string;
  sort_order: number;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApiBehavior {
  id: string;
  household_id: string;
  category_id: string;
  name: string;
  suggested_points: number;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApiPointGrant {
  id: string;
  household_id: string;
  member_id: string;
  category_id: string | null;
  behavior_id: string | null;
  points: number;
  reason: string;
  granted_by_account_id: string | null;
  granted_at: string;
}

export interface ApiCategoryTotal {
  category_id: string | null;
  total: number;
}

export interface ApiPointGrantSummary {
  id: string;
  points: number;
  reason: string;
  category_id: string | null;
  behavior_id: string | null;
  granted_at: string;
}

export interface ApiPointsBalance {
  member_id: string;
  total: number;
  by_category: ApiCategoryTotal[];
  recent: ApiPointGrantSummary[];
}

export interface ApiScoreboardEntry {
  member_id: string;
  total: number;
  by_category: ApiCategoryTotal[];
}

export interface ApiReward {
  id: string;
  household_id: string;
  name: string;
  description: string;
  image_url: string | null;
  cost_points: number;
  fulfillment_kind: "self_serve" | "needs_approval";
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ApiRedemption {
  id: string;
  household_id: string;
  reward_id: string;
  member_id: string;
  points_at_redemption: number;
  status: "pending" | "approved" | "fulfilled" | "declined";
  requested_at: string;
  decided_at: string | null;
  decided_by_account_id: string | null;
  fulfilled_at: string | null;
  decline_reason: string;
  grant_id: string | null;
}

export interface ApiRedeemResponse {
  redemption_id: string;
  status: "approved" | "pending";
  points_charged: number;
  new_balance: number;
  effective_cost: number;
}

export interface ApiSavingsGoal {
  id: string;
  member_id: string;
  reward_id: string;
  started_at: string;
  cleared_at: string | null;
}

export interface ApiRewardCostAdjustment {
  id: string;
  household_id: string;
  member_id: string;
  reward_id: string;
  delta_points: number;
  reason: string;
  expires_at: string | null;
  created_by_account_id: string | null;
  created_at: string;
}

export interface ApiTimelineEvent {
  kind: "point_grant" | "redemption" | "reward_cost_adjustment" | "wallet_transaction";
  id: string;
  occurred_at: string;
  amount: number; // signed
  reason: string;
  ref_a: string | null;
  ref_b: string | null;
}
```

- [ ] **Step 2: Verify type-checks**

Run: `cd web && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add web/src/lib/api/types.ts
git commit -m "feat(web): API types for points and rewards"
```

---

### Task 19: Add hooks for points + rewards

**Files:**
- Modify: `web/src/lib/api/hooks.ts`

- [ ] **Step 1: Append to the bottom of the file**

```ts
// ── Point categories ───────────────────────────────────────────────────────
export function usePointCategories(opts?: { includeArchived?: boolean }) {
  return useQuery<ApiPointCategory[]>({
    queryKey: ["point-categories", opts?.includeArchived ?? false],
    queryFn: () =>
      withFallback(
        () => api.get<ApiPointCategory[]>(`/v1/point-categories${opts?.includeArchived ? "?include_archived=true" : ""}`),
        () => fallback.pointCategories()
      ),
  });
}
export function useCreatePointCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: { name: string; color: string; sort_order?: number }) =>
      api.post<ApiPointCategory>("/v1/point-categories", req),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["point-categories"] }),
  });
}
export function useUpdatePointCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...patch }: { id: string; name?: string; color?: string; sort_order?: number }) =>
      api.patch<ApiPointCategory>(`/v1/point-categories/${id}`, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["point-categories"] }),
  });
}
export function useArchivePointCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) => api.delete(`/v1/point-categories/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["point-categories"] }),
  });
}

// ── Behaviors ───────────────────────────────────────────────────────────────
export function useBehaviors(opts?: { categoryId?: string; includeArchived?: boolean }) {
  return useQuery<ApiBehavior[]>({
    queryKey: ["behaviors", opts?.categoryId ?? null, opts?.includeArchived ?? false],
    queryFn: () => {
      const qs = new URLSearchParams();
      if (opts?.categoryId) qs.set("category_id", opts.categoryId);
      if (opts?.includeArchived) qs.set("include_archived", "true");
      return withFallback(
        () => api.get<ApiBehavior[]>(`/v1/behaviors${qs.toString() ? "?" + qs : ""}`),
        () => fallback.behaviors(opts?.categoryId)
      );
    },
  });
}
export function useCreateBehavior() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: { category_id: string; name: string; suggested_points: number }) =>
      api.post<ApiBehavior>("/v1/behaviors", req),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["behaviors"] }),
  });
}
export function useUpdateBehavior() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...patch }: { id: string; category_id?: string; name?: string; suggested_points?: number }) =>
      api.patch<ApiBehavior>(`/v1/behaviors/${id}`, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["behaviors"] }),
  });
}
export function useArchiveBehavior() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) => api.delete(`/v1/behaviors/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["behaviors"] }),
  });
}

// ── Points: balance / scoreboard / grant / adjust ─────────────────────────
export function usePointsBalance(memberId: string | undefined) {
  return useQuery<ApiPointsBalance>({
    queryKey: ["points-balance", memberId],
    queryFn: () => withFallback(
      () => api.get<ApiPointsBalance>(`/v1/points/${memberId}`),
      () => fallback.pointsBalance(memberId!)
    ),
    enabled: Boolean(memberId),
  });
}
export function useScoreboard() {
  return useQuery<ApiScoreboardEntry[]>({
    queryKey: ["scoreboard"],
    queryFn: () => withFallback(
      () => api.get<ApiScoreboardEntry[]>("/v1/points/scoreboard"),
      () => fallback.scoreboard()
    ),
    refetchInterval: 30_000,
  });
}
export function useGrantPoints() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ memberId, ...req }: { memberId: string; behavior_id?: string; category_id?: string; points: number; reason: string }) =>
      api.post<ApiPointGrant>(`/v1/points/${memberId}/grant`, req),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["points-balance"] });
      qc.invalidateQueries({ queryKey: ["scoreboard"] });
      qc.invalidateQueries({ queryKey: ["timeline"] });
    },
  });
}
export function useAdjustPoints() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ memberId, points, reason }: { memberId: string; points: number; reason: string }) =>
      api.post<ApiPointGrant>(`/v1/points/${memberId}/adjust`, { points, reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["points-balance"] });
      qc.invalidateQueries({ queryKey: ["scoreboard"] });
      qc.invalidateQueries({ queryKey: ["timeline"] });
    },
  });
}

// ── Rewards catalog ────────────────────────────────────────────────────────
export function useRewards(opts?: { onlyActive?: boolean }) {
  const onlyActive = opts?.onlyActive ?? true;
  return useQuery<ApiReward[]>({
    queryKey: ["rewards", onlyActive],
    queryFn: () => withFallback(
      () => api.get<ApiReward[]>(`/v1/rewards?active=${onlyActive}`),
      () => fallback.rewards()
    ),
  });
}
export function useCreateReward() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: { name: string; description?: string; image_url?: string | null; cost_points: number; fulfillment_kind: "self_serve" | "needs_approval" }) =>
      api.post<ApiReward>("/v1/rewards", req),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rewards"] }),
  });
}
export function useUpdateReward() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...patch }: { id: string; name?: string; description?: string; image_url?: string | null; cost_points?: number; fulfillment_kind?: "self_serve" | "needs_approval"; active?: boolean }) =>
      api.patch<ApiReward>(`/v1/rewards/${id}`, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rewards"] }),
  });
}
export function useArchiveReward() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) => api.delete(`/v1/rewards/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rewards"] }),
  });
}

// ── Redemptions ────────────────────────────────────────────────────────────
export function useRedeemReward() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ rewardId }: { rewardId: string }) => api.post<ApiRedeemResponse>(`/v1/rewards/${rewardId}/redeem`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["points-balance"] });
      qc.invalidateQueries({ queryKey: ["redemptions"] });
      qc.invalidateQueries({ queryKey: ["timeline"] });
    },
  });
}
export function useRedemptions(opts?: { memberId?: string; status?: string }) {
  return useQuery<ApiRedemption[]>({
    queryKey: ["redemptions", opts?.memberId ?? null, opts?.status ?? null],
    queryFn: () => {
      const qs = new URLSearchParams();
      if (opts?.memberId) qs.set("member_id", opts.memberId);
      if (opts?.status) qs.set("status", opts.status);
      return withFallback(
        () => api.get<ApiRedemption[]>(`/v1/redemptions${qs.toString() ? "?" + qs : ""}`),
        () => fallback.redemptions()
      );
    },
  });
}
export function useApproveRedemption() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) => api.post<ApiRedemption>(`/v1/redemptions/${id}/approve`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["redemptions"] });
      qc.invalidateQueries({ queryKey: ["points-balance"] });
      qc.invalidateQueries({ queryKey: ["timeline"] });
    },
  });
}
export function useDeclineRedemption() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api.post<ApiRedemption>(`/v1/redemptions/${id}/decline`, { reason }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["redemptions"] }),
  });
}
export function useFulfillRedemption() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) => api.post<ApiRedemption>(`/v1/redemptions/${id}/fulfill`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["redemptions"] }),
  });
}

// ── Savings goal ───────────────────────────────────────────────────────────
export function useSetSavingsGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ memberId, rewardId }: { memberId: string; rewardId: string | null }) =>
      api.put<ApiSavingsGoal | null>(`/v1/savings-goals/${memberId}`, { reward_id: rewardId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["points-balance"] }),
  });
}

// ── Reward cost adjustments ────────────────────────────────────────────────
export function useCostAdjustReward() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ rewardId, ...req }: { rewardId: string; member_id: string; delta_points: number; reason: string; expires_at?: string }) =>
      api.post<ApiRewardCostAdjustment>(`/v1/rewards/${rewardId}/cost-adjust`, req),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rewards"] });
      qc.invalidateQueries({ queryKey: ["timeline"] });
    },
  });
}
export function useDeleteRewardAdjustment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) => api.delete(`/v1/reward-adjustments/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rewards"] }),
  });
}

// ── Timeline ───────────────────────────────────────────────────────────────
export function useTimeline(memberId: string | undefined, opts?: { limit?: number; offset?: number }) {
  const limit = opts?.limit ?? 50;
  const offset = opts?.offset ?? 0;
  return useQuery<ApiTimelineEvent[]>({
    queryKey: ["timeline", memberId, limit, offset],
    queryFn: () => withFallback(
      () => api.get<ApiTimelineEvent[]>(`/v1/timeline/${memberId}?limit=${limit}&offset=${offset}`),
      () => fallback.timeline(memberId!)
    ),
    enabled: Boolean(memberId),
  });
}
```

(Imports at the top of the file must include the new `Api*` types.)

- [ ] **Step 2: Verify type-checks**

Run: `cd web && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add web/src/lib/api/hooks.ts
git commit -m "feat(web): hooks for points, behaviors, rewards, redemptions, savings, timeline"
```

---

### Task 20: Add fallback shapes

**Files:**
- Modify: `web/src/lib/api/fallback.ts`

- [ ] **Step 1: Append to the `fallback` object**

```ts
  pointCategories(): ApiPointCategory[] {
    const now = new Date().toISOString();
    return [
      { id: "cat-kindness",       household_id: "h1", name: "Kindness",       color: "#ec4899", sort_order: 1, archived_at: null, created_at: now, updated_at: now },
      { id: "cat-effort",         household_id: "h1", name: "Effort",         color: "#10b981", sort_order: 2, archived_at: null, created_at: now, updated_at: now },
      { id: "cat-responsibility", household_id: "h1", name: "Responsibility", color: "#f59e0b", sort_order: 3, archived_at: null, created_at: now, updated_at: now },
      { id: "cat-listening",      household_id: "h1", name: "Listening",      color: "#3b82f6", sort_order: 4, archived_at: null, created_at: now, updated_at: now },
    ];
  },
  behaviors(categoryId?: string): ApiBehavior[] {
    const now = new Date().toISOString();
    const all: ApiBehavior[] = [
      { id: "b1", household_id: "h1", category_id: "cat-kindness",       name: "Helped a sibling",        suggested_points: 3, archived_at: null, created_at: now, updated_at: now },
      { id: "b2", household_id: "h1", category_id: "cat-effort",         name: "Did homework w/o reminder", suggested_points: 5, archived_at: null, created_at: now, updated_at: now },
      { id: "b3", household_id: "h1", category_id: "cat-responsibility", name: "Cleaned up own mess",     suggested_points: 2, archived_at: null, created_at: now, updated_at: now },
      { id: "b4", household_id: "h1", category_id: "cat-listening",      name: "First-time listener",     suggested_points: 4, archived_at: null, created_at: now, updated_at: now },
    ];
    return categoryId ? all.filter(b => b.category_id === categoryId) : all;
  },
  pointsBalance(memberId: string): ApiPointsBalance {
    const now = new Date().toISOString();
    return {
      member_id: memberId,
      total: 47,
      by_category: [
        { category_id: "cat-kindness",       total: 12 },
        { category_id: "cat-effort",         total: 20 },
        { category_id: "cat-responsibility", total: 10 },
        { category_id: "cat-listening",      total: 5 },
      ],
      recent: [
        { id: "g1", points: 3,  reason: "Helped Theo find his shoe", category_id: "cat-kindness", behavior_id: "b1", granted_at: now },
        { id: "g2", points: 5,  reason: "Started homework right away", category_id: "cat-effort", behavior_id: "b2", granted_at: now },
        { id: "g3", points: -10, reason: "Redeemed: stickers", category_id: null, behavior_id: null, granted_at: now },
      ],
    };
  },
  scoreboard(): ApiScoreboardEntry[] {
    return [
      { member_id: "m1", total: 84, by_category: [{ category_id: "cat-effort", total: 40 }, { category_id: "cat-kindness", total: 24 }, { category_id: "cat-responsibility", total: 12 }, { category_id: "cat-listening", total: 8 }] },
      { member_id: "m2", total: 47, by_category: [{ category_id: "cat-effort", total: 20 }, { category_id: "cat-kindness", total: 12 }, { category_id: "cat-responsibility", total: 10 }, { category_id: "cat-listening", total: 5 }] },
    ];
  },
  rewards(): ApiReward[] {
    const now = new Date().toISOString();
    return [
      { id: "r1", household_id: "h1", name: "Stickers",        description: "Sheet of stickers", image_url: null, cost_points: 30,  fulfillment_kind: "self_serve",     active: true, created_at: now, updated_at: now },
      { id: "r2", household_id: "h1", name: "Movie night pick", description: "Pick the family movie", image_url: null, cost_points: 75,  fulfillment_kind: "needs_approval", active: true, created_at: now, updated_at: now },
      { id: "r3", household_id: "h1", name: "Xbox game",        description: "$60 budget", image_url: null, cost_points: 500, fulfillment_kind: "needs_approval", active: true, created_at: now, updated_at: now },
    ];
  },
  redemptions(): ApiRedemption[] {
    const now = new Date().toISOString();
    return [
      { id: "rd1", household_id: "h1", reward_id: "r1", member_id: "m1", points_at_redemption: 30, status: "fulfilled", requested_at: now, decided_at: now, decided_by_account_id: null, fulfilled_at: now, decline_reason: "", grant_id: null },
      { id: "rd2", household_id: "h1", reward_id: "r2", member_id: "m2", points_at_redemption: 75, status: "pending",   requested_at: now, decided_at: null, decided_by_account_id: null, fulfilled_at: null, decline_reason: "", grant_id: null },
    ];
  },
  timeline(memberId: string): ApiTimelineEvent[] {
    const now = new Date().toISOString();
    return [
      { kind: "point_grant",            id: "g1", occurred_at: now, amount: 3,    reason: "Helped Theo",       ref_a: "b1", ref_b: "cat-kindness" },
      { kind: "wallet_transaction",     id: "t1", occurred_at: now, amount: 30,   reason: "Brush teeth",       ref_a: "chore_payout", ref_b: null },
      { kind: "redemption",             id: "rd1", occurred_at: now, amount: 30,  reason: "approved",          ref_a: "r1", ref_b: null },
      { kind: "reward_cost_adjustment", id: "a1", occurred_at: now, amount: 25,   reason: "Hit at school",     ref_a: "r3", ref_b: null },
    ];
  },
```

(Plus add the imports for the new types at the top of `fallback.ts`.)

- [ ] **Step 2: Verify type-checks**

Run: `cd web && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add web/src/lib/api/fallback.ts
git commit -m "feat(web): fallback shapes for points and rewards demo mode"
```

---

## Phase 9: UI primitives

### Task 21: `PointsBadge` primitive

**Files:**
- Create: `web/src/components/ui/points-badge.tsx`
- Create: `web/src/components/ui/points-badge.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { PointsBadge } from "./points-badge";

describe("PointsBadge", () => {
  it("renders the value with a + sign for positive values", () => {
    render(<PointsBadge value={5} color="#10b981" />);
    expect(screen.getByText("+5")).toBeInTheDocument();
  });
  it("renders negative values with a minus sign", () => {
    render(<PointsBadge value={-10} color="#10b981" />);
    expect(screen.getByText("-10")).toBeInTheDocument();
  });
  it("uses the passed color in inline style", () => {
    const { container } = render(<PointsBadge value={1} color="#ec4899" />);
    expect(container.firstChild).toHaveStyle({ backgroundColor: "#ec4899" });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && npx vitest run src/components/ui/points-badge.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```tsx
// web/src/components/ui/points-badge.tsx
import { cn } from "@/lib/utils";

export interface PointsBadgeProps {
  value: number;
  color: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function PointsBadge({ value, color, className, size = "md" }: PointsBadgeProps) {
  const sign = value > 0 ? "+" : "";
  const sizeClass = size === "sm" ? "text-xs px-2 py-0.5" : size === "lg" ? "text-lg px-4 py-1.5" : "text-sm px-3 py-1";
  return (
    <span
      className={cn("inline-flex items-center rounded-full font-semibold text-white", sizeClass, className)}
      style={{ backgroundColor: color }}
    >
      {sign}{value}
    </span>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Expected: PASS for all three.

- [ ] **Step 5: Commit**

```bash
git add web/src/components/ui/points-badge.tsx web/src/components/ui/points-badge.test.tsx
git commit -m "feat(ui): PointsBadge primitive"
```

---

### Task 22: `RewardCard` primitive

**Files:**
- Create: `web/src/components/ui/reward-card.tsx`
- Create: `web/src/components/ui/reward-card.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { RewardCard } from "./reward-card";

describe("RewardCard", () => {
  const baseReward = {
    id: "r1", household_id: "h1", name: "Stickers", description: "",
    image_url: null, cost_points: 50,
    fulfillment_kind: "self_serve" as const, active: true,
    created_at: "", updated_at: "",
  };

  it("renders name and effective cost", () => {
    render(<RewardCard reward={baseReward} effectiveCost={50} balance={100} />);
    expect(screen.getByText("Stickers")).toBeInTheDocument();
    expect(screen.getByText("50 pts")).toBeInTheDocument();
  });
  it("disables redeem button when balance < effective cost", () => {
    render(<RewardCard reward={baseReward} effectiveCost={50} balance={10} />);
    expect(screen.getByRole("button", { name: /need 40 more/i })).toBeDisabled();
  });
  it("shows progress when goal mode is active", () => {
    render(<RewardCard reward={baseReward} effectiveCost={100} balance={40} goalMode />);
    expect(screen.getByText(/40\s*\/\s*100/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Expected: FAIL.

- [ ] **Step 3: Implement**

```tsx
// web/src/components/ui/reward-card.tsx
import type { ApiReward } from "@/lib/api/types";
import { cn } from "@/lib/utils";

export interface RewardCardProps {
  reward: ApiReward;
  effectiveCost: number;
  balance: number;
  goalMode?: boolean;
  onRedeem?: () => void;
  className?: string;
}

export function RewardCard({ reward, effectiveCost, balance, goalMode, onRedeem, className }: RewardCardProps) {
  const canAfford = balance >= effectiveCost;
  const short = effectiveCost - balance;
  const ctaLabel = canAfford
    ? reward.fulfillment_kind === "self_serve" ? "Redeem" : "Request"
    : `Need ${short} more`;
  const progress = Math.min(100, Math.round((balance / effectiveCost) * 100));

  return (
    <div className={cn("rounded-2xl bg-white shadow-sm border border-zinc-200 overflow-hidden flex flex-col", className)}>
      {reward.image_url && <img src={reward.image_url} alt="" className="w-full aspect-[4/3] object-cover" />}
      <div className="p-4 flex-1 flex flex-col">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="font-semibold text-zinc-900">{reward.name}</h3>
          <span className="text-sm font-medium text-zinc-500">{effectiveCost} pts</span>
        </div>
        {reward.description && <p className="mt-1 text-sm text-zinc-600 line-clamp-2">{reward.description}</p>}

        {goalMode && (
          <div className="mt-3">
            <div className="h-2 rounded-full bg-zinc-100 overflow-hidden">
              <div className="h-full bg-emerald-500 transition-all" style={{ width: `${progress}%` }} />
            </div>
            <div className="mt-1 text-xs text-zinc-500">{balance} / {effectiveCost}</div>
          </div>
        )}

        <button
          type="button"
          disabled={!canAfford}
          onClick={onRedeem}
          className={cn(
            "mt-4 w-full rounded-xl py-2 font-semibold text-white",
            canAfford ? "bg-emerald-600 hover:bg-emerald-500" : "bg-zinc-300 cursor-not-allowed"
          )}
        >
          {ctaLabel}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/src/components/ui/reward-card.tsx web/src/components/ui/reward-card.test.tsx
git commit -m "feat(ui): RewardCard primitive with effective-cost + goal-mode progress"
```

---

## Phase 10: Kid-facing screens

### Task 23: `RewardsKid` screen

**Files:**
- Create: `web/src/components/screens/rewards-kid.tsx`
- Create: `web/src/components/screens/rewards-kid.test.tsx`
- Create: `web/src/app/rewards/page.tsx`

- [ ] **Step 1: Write screen + a smoke test**

```tsx
// web/src/components/screens/rewards-kid.tsx
"use client";

import { useMemo, useState } from "react";
import { useRewards, usePointsBalance, useRedeemReward, useSetSavingsGoal } from "@/lib/api/hooks";
import { RewardCard } from "@/components/ui/reward-card";
import { effectiveCost } from "@/lib/points/effective-cost";
import type { ApiReward } from "@/lib/api/types";

export interface RewardsKidProps { memberId: string; }

export function RewardsKid({ memberId }: RewardsKidProps) {
  const rewards = useRewards();
  const balance = usePointsBalance(memberId);
  const redeem = useRedeemReward();
  const setGoal = useSetSavingsGoal();
  const [activeGoal, setActiveGoal] = useState<string | null>(null);
  const [toast, setToast] = useState<string>("");

  const list = rewards.data ?? [];
  const total = balance.data?.total ?? 0;

  const cards = useMemo(() => list.map((r: ApiReward) => ({
    reward: r,
    cost: effectiveCost(r.cost_points, []), // adjustments fetched server-side via Redeem; cost on read for now is base
  })), [list]);

  const onRedeem = async (rewardId: string) => {
    const res = await redeem.mutateAsync({ rewardId });
    setToast(res.status === "approved" ? `Redeemed! ${res.points_charged} pts spent.` : "Request sent — waiting for parent approval.");
    setTimeout(() => setToast(""), 3000);
  };

  const onSetGoal = async (rewardId: string) => {
    const next = activeGoal === rewardId ? null : rewardId;
    setActiveGoal(next);
    await setGoal.mutateAsync({ memberId, rewardId: next });
  };

  return (
    <section className="p-4">
      <header className="mb-4 flex items-baseline justify-between">
        <h1 className="text-2xl font-bold text-zinc-900">Rewards</h1>
        <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-800 font-semibold">{total} pts</span>
      </header>

      <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map(({ reward, cost }) => (
          <li key={reward.id}>
            <RewardCard reward={reward} effectiveCost={cost} balance={total} goalMode={activeGoal === reward.id} onRedeem={() => onRedeem(reward.id)} />
            <button onClick={() => onSetGoal(reward.id)} className="mt-2 w-full text-sm text-emerald-700 hover:underline">
              {activeGoal === reward.id ? "✓ Saving for this" : "Save for this"}
            </button>
          </li>
        ))}
      </ul>

      {toast && <div role="status" className="fixed bottom-4 left-1/2 -translate-x-1/2 rounded-xl bg-zinc-900 px-4 py-2 text-white shadow-lg">{toast}</div>}
    </section>
  );
}
```

```tsx
// web/src/components/screens/rewards-kid.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RewardsKid } from "./rewards-kid";

describe("RewardsKid", () => {
  it("renders heading + at least one fallback reward", async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <RewardsKid memberId="m1" />
      </QueryClientProvider>
    );
    expect(await screen.findByText(/Rewards/i)).toBeInTheDocument();
    expect(await screen.findByText("Stickers")).toBeInTheDocument();
  });
});
```

```tsx
// web/src/app/rewards/page.tsx
"use client";

import { useAuthStore } from "@/lib/auth/auth-store";
import { RewardsKid } from "@/components/screens/rewards-kid";

export default function RewardsPage() {
  const memberId = useAuthStore((s) => s.memberId);
  if (!memberId) return null;
  return <RewardsKid memberId={memberId} />;
}
```

- [ ] **Step 2: Run test to verify it passes**

Run: `cd web && npx vitest run src/components/screens/rewards-kid.test.tsx`
Expected: PASS (loads fallback shapes from Task 20).

- [ ] **Step 3: Verify route renders in dev**

Run: `cd web && npm run dev` (background) and curl `http://localhost:3000/rewards`
Expected: 200 (or browser shows the page with the 3 fallback rewards).

- [ ] **Step 4: Commit**

```bash
git add web/src/components/screens/rewards-kid.tsx web/src/components/screens/rewards-kid.test.tsx web/src/app/rewards/page.tsx
git commit -m "feat(web): /rewards kid screen with redeem + save-for-this"
```

---

### Task 24: `Scoreboard` screen + route

**Files:**
- Create: `web/src/components/screens/scoreboard.tsx`
- Create: `web/src/components/screens/scoreboard.test.tsx`
- Create: `web/src/app/scoreboard/page.tsx`

- [ ] **Step 1: Implement**

```tsx
// web/src/components/screens/scoreboard.tsx
"use client";

import { useMembers, useScoreboard, usePointCategories } from "@/lib/api/hooks";

export function Scoreboard() {
  const sb = useScoreboard();
  const members = useMembers();
  const cats = usePointCategories();
  const memberMap = new Map((members.data ?? []).map(m => [m.id, m]));
  const catMap = new Map((cats.data ?? []).map(c => [c.id, c]));
  const rows = sb.data ?? [];

  return (
    <section className="p-4">
      <h1 className="text-2xl font-bold text-zinc-900 mb-4">Scoreboard</h1>
      <ol className="space-y-3">
        {rows.map((row, i) => {
          const m = memberMap.get(row.member_id);
          const isFirst = i === 0;
          return (
            <li key={row.member_id} className="rounded-2xl bg-white border border-zinc-200 p-4 flex items-center gap-4">
              <span className={`text-2xl font-bold w-10 text-center ${isFirst ? "text-amber-500" : "text-zinc-400"}`}>{isFirst ? "👑" : `#${i + 1}`}</span>
              <div className="flex-1">
                <div className="flex items-baseline justify-between">
                  <span className="font-semibold text-zinc-900" style={{ color: m?.color ?? undefined }}>{m?.name ?? "—"}</span>
                  <span className="text-xl font-bold">{row.total} pts</span>
                </div>
                <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {row.by_category.filter(c => c.category_id).map(c => {
                    const cat = catMap.get(c.category_id!);
                    return (
                      <div key={c.category_id} className="text-xs">
                        <div className="flex items-baseline justify-between">
                          <span className="text-zinc-500">{cat?.name ?? "—"}</span>
                          <span className="font-medium">{c.total}</span>
                        </div>
                        <div className="mt-1 h-1.5 rounded-full bg-zinc-100 overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${row.total ? (c.total / row.total) * 100 : 0}%`, backgroundColor: cat?.color ?? "#9ca3af" }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
```

```tsx
// web/src/components/screens/scoreboard.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Scoreboard } from "./scoreboard";

describe("Scoreboard", () => {
  it("renders the heading and at least one row from fallback", async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={qc}><Scoreboard /></QueryClientProvider>);
    expect(await screen.findByText(/Scoreboard/i)).toBeInTheDocument();
  });
});
```

```tsx
// web/src/app/scoreboard/page.tsx
"use client";
import { Scoreboard } from "@/components/screens/scoreboard";
export default function Page() { return <Scoreboard />; }
```

- [ ] **Step 2: Run test to verify it passes**

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add web/src/components/screens/scoreboard.tsx web/src/components/screens/scoreboard.test.tsx web/src/app/scoreboard/page.tsx
git commit -m "feat(web): /scoreboard with per-category bars + 1st-place crown"
```

---

### Task 25: `Timeline` screen + dynamic route

**Files:**
- Create: `web/src/components/screens/timeline.tsx`
- Create: `web/src/components/screens/timeline.test.tsx`
- Create: `web/src/app/timeline/[memberId]/page.tsx`

- [ ] **Step 1: Implement**

```tsx
// web/src/components/screens/timeline.tsx
"use client";

import { useTimeline } from "@/lib/api/hooks";
import type { ApiTimelineEvent } from "@/lib/api/types";

const KIND_COLOR: Record<ApiTimelineEvent["kind"], string> = {
  point_grant: "border-emerald-500",
  redemption: "border-purple-500",
  reward_cost_adjustment: "border-orange-500",
  wallet_transaction: "border-amber-500",
};

const KIND_LABEL: Record<ApiTimelineEvent["kind"], string> = {
  point_grant: "Points",
  redemption: "Redemption",
  reward_cost_adjustment: "Cost adjustment",
  wallet_transaction: "Wallet",
};

function fmtAmount(e: ApiTimelineEvent): string {
  if (e.kind === "wallet_transaction") {
    const sign = e.amount >= 0 ? "+" : "-";
    return `${sign}$${(Math.abs(e.amount) / 100).toFixed(2)}`;
  }
  if (e.kind === "redemption") return `${e.amount} pts (${e.reason})`;
  const sign = e.amount > 0 ? "+" : "";
  return `${sign}${e.amount} pts`;
}

export interface TimelineProps { memberId: string; }

export function Timeline({ memberId }: TimelineProps) {
  const { data: events = [], isLoading } = useTimeline(memberId);

  if (isLoading) return <p className="p-4 text-zinc-500">Loading…</p>;

  return (
    <section className="p-4">
      <h1 className="text-2xl font-bold text-zinc-900 mb-4">Timeline</h1>
      <ul className="space-y-2">
        {events.map(e => (
          <li key={`${e.kind}-${e.id}`} className={`rounded-xl bg-white border-l-4 ${KIND_COLOR[e.kind]} border border-zinc-200 p-3`}>
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-medium text-zinc-700">{KIND_LABEL[e.kind]}</span>
              <span className="text-xs text-zinc-400">{new Date(e.occurred_at).toLocaleString()}</span>
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-zinc-900">{e.reason || "—"}</span>
              <span className="font-semibold">{fmtAmount(e)}</span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
```

```tsx
// web/src/components/screens/timeline.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Timeline } from "./timeline";

describe("Timeline", () => {
  it("renders heading + fallback events", async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={qc}><Timeline memberId="m1" /></QueryClientProvider>);
    expect(await screen.findByText(/Timeline/i)).toBeInTheDocument();
  });
});
```

```tsx
// web/src/app/timeline/[memberId]/page.tsx
"use client";
import { use } from "react";
import { Timeline } from "@/components/screens/timeline";

export default function Page({ params }: { params: Promise<{ memberId: string }> }) {
  // Next.js 16: params is a Promise
  const { memberId } = use(params);
  return <Timeline memberId={memberId} />;
}
```

- [ ] **Step 2: Run test to verify it passes**

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add web/src/components/screens/timeline.tsx web/src/components/screens/timeline.test.tsx web/src/app/timeline/
git commit -m "feat(web): /timeline/{member_id} unified per-kid event stream"
```

---

## Phase 11: Admin screens

### Task 26: `/admin/points` — categories + behaviors CRUD

**Files:**
- Create: `web/src/components/screens/points-admin.tsx`
- Create: `web/src/app/admin/points/page.tsx`

- [ ] **Step 1: Implement two-tab admin (Categories | Behaviors) with simple forms**

```tsx
// web/src/components/screens/points-admin.tsx
"use client";

import { useState } from "react";
import {
  usePointCategories, useCreatePointCategory, useUpdatePointCategory, useArchivePointCategory,
  useBehaviors, useCreateBehavior, useUpdateBehavior, useArchiveBehavior,
} from "@/lib/api/hooks";

type Tab = "categories" | "behaviors";

export function PointsAdmin() {
  const [tab, setTab] = useState<Tab>("categories");
  return (
    <section className="p-4">
      <h1 className="text-2xl font-bold mb-4">Points Admin</h1>
      <nav className="flex gap-2 mb-4">
        <button onClick={() => setTab("categories")} className={`rounded-full px-4 py-1 ${tab === "categories" ? "bg-zinc-900 text-white" : "bg-zinc-100"}`}>Categories</button>
        <button onClick={() => setTab("behaviors")}  className={`rounded-full px-4 py-1 ${tab === "behaviors"  ? "bg-zinc-900 text-white" : "bg-zinc-100"}`}>Behaviors</button>
      </nav>
      {tab === "categories" ? <CategoriesPanel /> : <BehaviorsPanel />}
    </section>
  );
}

function CategoriesPanel() {
  const list = usePointCategories();
  const create = useCreatePointCategory();
  const update = useUpdatePointCategory();
  const archive = useArchivePointCategory();
  const [name, setName] = useState("");
  const [color, setColor] = useState("#10b981");

  return (
    <div className="space-y-3">
      <form onSubmit={(e) => { e.preventDefault(); if (name) { create.mutate({ name, color }); setName(""); } }} className="flex gap-2 items-end">
        <label className="flex-1"><span className="block text-xs text-zinc-500 mb-1">Name</span><input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-xl border border-zinc-300 px-3 py-2" /></label>
        <label><span className="block text-xs text-zinc-500 mb-1">Color</span><input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-10 w-12 rounded-xl border border-zinc-300" /></label>
        <button type="submit" className="rounded-xl bg-emerald-600 text-white px-4 py-2 font-semibold">Add</button>
      </form>
      <ul className="divide-y divide-zinc-200 rounded-2xl border border-zinc-200 bg-white">
        {(list.data ?? []).map(c => (
          <li key={c.id} className="flex items-center gap-3 p-3">
            <span className="h-4 w-4 rounded-full" style={{ backgroundColor: c.color }} />
            <input defaultValue={c.name} onBlur={(e) => e.target.value !== c.name && update.mutate({ id: c.id, name: e.target.value })} className="flex-1 bg-transparent" />
            <button onClick={() => archive.mutate({ id: c.id })} className="text-sm text-rose-600 hover:underline">Archive</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function BehaviorsPanel() {
  const cats = usePointCategories();
  const list = useBehaviors();
  const create = useCreateBehavior();
  const update = useUpdateBehavior();
  const archive = useArchiveBehavior();
  const [categoryId, setCategoryId] = useState<string>("");
  const [name, setName] = useState("");
  const [pts, setPts] = useState(1);

  return (
    <div className="space-y-3">
      <form onSubmit={(e) => { e.preventDefault(); if (categoryId && name) { create.mutate({ category_id: categoryId, name, suggested_points: pts }); setName(""); } }} className="flex gap-2 items-end flex-wrap">
        <label className="flex-1 min-w-[200px]"><span className="block text-xs text-zinc-500 mb-1">Behavior</span><input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-xl border border-zinc-300 px-3 py-2" /></label>
        <label><span className="block text-xs text-zinc-500 mb-1">Category</span><select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="rounded-xl border border-zinc-300 px-3 py-2"><option value="">—</option>{(cats.data ?? []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <label><span className="block text-xs text-zinc-500 mb-1">Points</span><input type="number" min={0} value={pts} onChange={(e) => setPts(Number(e.target.value))} className="w-20 rounded-xl border border-zinc-300 px-3 py-2" /></label>
        <button type="submit" className="rounded-xl bg-emerald-600 text-white px-4 py-2 font-semibold">Add</button>
      </form>
      <ul className="divide-y divide-zinc-200 rounded-2xl border border-zinc-200 bg-white">
        {(list.data ?? []).map(b => (
          <li key={b.id} className="grid grid-cols-[1fr_auto_auto_auto] gap-3 p-3 items-center">
            <input defaultValue={b.name} onBlur={(e) => e.target.value !== b.name && update.mutate({ id: b.id, name: e.target.value })} className="bg-transparent" />
            <span className="text-sm text-zinc-500">{(cats.data ?? []).find(c => c.id === b.category_id)?.name ?? "—"}</span>
            <input type="number" defaultValue={b.suggested_points} onBlur={(e) => Number(e.target.value) !== b.suggested_points && update.mutate({ id: b.id, suggested_points: Number(e.target.value) })} className="w-16 text-right" />
            <button onClick={() => archive.mutate({ id: b.id })} className="text-sm text-rose-600 hover:underline">Archive</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

```tsx
// web/src/app/admin/points/page.tsx
"use client";
import { PointsAdmin } from "@/components/screens/points-admin";
export default function Page() { return <PointsAdmin />; }
```

- [ ] **Step 2: Verify type-checks and renders**

Run: `cd web && npx tsc --noEmit && npx vitest run`
Expected: no errors, all tests pass.

- [ ] **Step 3: Commit**

```bash
git add web/src/components/screens/points-admin.tsx web/src/app/admin/points/page.tsx
git commit -m "feat(web): /admin/points categories + behaviors CRUD"
```

---

### Task 27: `/admin/points/award` — fast burst award screen

**Files:**
- Create: `web/src/components/screens/quick-award.tsx`
- Create: `web/src/app/admin/points/award/page.tsx`

- [ ] **Step 1: Implement member-tile → category → behavior → "+N" flow**

```tsx
// web/src/components/screens/quick-award.tsx
"use client";

import { useState } from "react";
import { useMembers, usePointCategories, useBehaviors, useGrantPoints } from "@/lib/api/hooks";

export function QuickAward() {
  const members = useMembers();
  const cats = usePointCategories();
  const behaviors = useBehaviors();
  const grant = useGrantPoints();

  const kids = (members.data ?? []).filter(m => m.role === "kid");

  const [memberId, setMemberId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [toast, setToast] = useState("");

  const filteredBehaviors = (behaviors.data ?? []).filter(b => !categoryId || b.category_id === categoryId);

  const award = async (b: { id: string; suggested_points: number; category_id: string; name: string }) => {
    if (!memberId) return;
    await grant.mutateAsync({ memberId, behavior_id: b.id, category_id: b.category_id, points: b.suggested_points, reason: b.name });
    setToast(`+${b.suggested_points} to ${kids.find(k => k.id === memberId)?.name ?? ""}`);
    setTimeout(() => setToast(""), 1500);
  };

  return (
    <section className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">Quick Award</h1>
      <div>
        <h2 className="text-sm uppercase text-zinc-500 mb-2">Who</h2>
        <div className="flex gap-2 flex-wrap">
          {kids.map(k => (
            <button key={k.id} onClick={() => setMemberId(k.id)} className={`rounded-2xl px-4 py-3 font-semibold border-2 ${memberId === k.id ? "border-zinc-900" : "border-zinc-200"}`} style={{ color: k.color ?? undefined }}>{k.name}</button>
          ))}
        </div>
      </div>

      {memberId && (
        <div>
          <h2 className="text-sm uppercase text-zinc-500 mb-2">Category</h2>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setCategoryId(null)} className={`rounded-full px-3 py-1 ${categoryId === null ? "bg-zinc-900 text-white" : "bg-zinc-100"}`}>All</button>
            {(cats.data ?? []).map(c => (
              <button key={c.id} onClick={() => setCategoryId(c.id)} className={`rounded-full px-3 py-1 ${categoryId === c.id ? "text-white" : ""}`} style={{ backgroundColor: categoryId === c.id ? c.color : "#f4f4f5" }}>{c.name}</button>
            ))}
          </div>
        </div>
      )}

      {memberId && (
        <div>
          <h2 className="text-sm uppercase text-zinc-500 mb-2">Behavior</h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {filteredBehaviors.map(b => (
              <li key={b.id}>
                <button onClick={() => award(b)} className="w-full rounded-2xl bg-white border border-zinc-200 p-4 text-left hover:bg-zinc-50">
                  <div className="flex items-baseline justify-between">
                    <span className="font-semibold">{b.name}</span>
                    <span className="text-emerald-600 font-bold">+{b.suggested_points}</span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {toast && <div role="status" className="fixed bottom-4 left-1/2 -translate-x-1/2 rounded-xl bg-emerald-600 text-white px-4 py-2 shadow-lg">{toast}</div>}
    </section>
  );
}
```

```tsx
// web/src/app/admin/points/award/page.tsx
"use client";
import { QuickAward } from "@/components/screens/quick-award";
export default function Page() { return <QuickAward />; }
```

- [ ] **Step 2: Commit**

```bash
git add web/src/components/screens/quick-award.tsx web/src/app/admin/points/award/page.tsx
git commit -m "feat(web): /admin/points/award fast-burst award screen"
```

---

### Task 28: `/admin/rewards` — catalog CRUD + pending redemption queue

**Files:**
- Create: `web/src/components/screens/rewards-admin.tsx`
- Create: `web/src/app/admin/rewards/page.tsx`

- [ ] **Step 1: Implement**

```tsx
// web/src/components/screens/rewards-admin.tsx
"use client";

import { useState } from "react";
import { useRewards, useCreateReward, useUpdateReward, useArchiveReward, useRedemptions, useApproveRedemption, useDeclineRedemption, useFulfillRedemption, useMembers } from "@/lib/api/hooks";

export function RewardsAdmin() {
  const rewards = useRewards({ onlyActive: false });
  const create = useCreateReward();
  const update = useUpdateReward();
  const archive = useArchiveReward();
  const pending = useRedemptions({ status: "pending" });
  const approve = useApproveRedemption();
  const decline = useDeclineRedemption();
  const fulfill = useFulfillRedemption();
  const members = useMembers();
  const memberMap = new Map((members.data ?? []).map(m => [m.id, m]));
  const rewardMap = new Map((rewards.data ?? []).map(r => [r.id, r]));

  const [name, setName] = useState("");
  const [cost, setCost] = useState(50);
  const [kind, setKind] = useState<"self_serve" | "needs_approval">("needs_approval");

  return (
    <section className="p-4 space-y-6">
      <h1 className="text-2xl font-bold">Rewards Admin</h1>

      {(pending.data ?? []).length > 0 && (
        <section className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-4">
          <h2 className="font-semibold mb-2">Pending requests ({(pending.data ?? []).length})</h2>
          <ul className="space-y-2">
            {(pending.data ?? []).map(r => (
              <li key={r.id} className="flex items-center gap-3 bg-white rounded-xl p-3">
                <div className="flex-1">
                  <div className="font-medium">{memberMap.get(r.member_id)?.name ?? "—"} → {rewardMap.get(r.reward_id)?.name ?? "—"}</div>
                  <div className="text-sm text-zinc-500">{r.points_at_redemption} pts</div>
                </div>
                <button onClick={() => approve.mutate({ id: r.id })} className="rounded-xl bg-emerald-600 text-white px-3 py-1 font-semibold">Approve</button>
                <button onClick={() => { const reason = prompt("Reason for declining?") ?? ""; if (reason) decline.mutate({ id: r.id, reason }); }} className="rounded-xl bg-rose-600 text-white px-3 py-1 font-semibold">Decline</button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="font-semibold mb-2">Catalog</h2>
        <form onSubmit={(e) => { e.preventDefault(); if (name && cost >= 0) { create.mutate({ name, cost_points: cost, fulfillment_kind: kind }); setName(""); } }} className="flex gap-2 items-end flex-wrap mb-3">
          <label className="flex-1 min-w-[160px]"><span className="block text-xs text-zinc-500 mb-1">Name</span><input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-xl border border-zinc-300 px-3 py-2" /></label>
          <label><span className="block text-xs text-zinc-500 mb-1">Cost</span><input type="number" min={0} value={cost} onChange={(e) => setCost(Number(e.target.value))} className="w-24 rounded-xl border border-zinc-300 px-3 py-2" /></label>
          <label><span className="block text-xs text-zinc-500 mb-1">Fulfillment</span><select value={kind} onChange={(e) => setKind(e.target.value as "self_serve" | "needs_approval")} className="rounded-xl border border-zinc-300 px-3 py-2"><option value="needs_approval">Needs approval</option><option value="self_serve">Self-serve</option></select></label>
          <button type="submit" className="rounded-xl bg-emerald-600 text-white px-4 py-2 font-semibold">Add</button>
        </form>

        <ul className="divide-y divide-zinc-200 rounded-2xl border border-zinc-200 bg-white">
          {(rewards.data ?? []).map(r => (
            <li key={r.id} className="grid grid-cols-[1fr_auto_auto_auto] gap-3 p-3 items-center">
              <input defaultValue={r.name} onBlur={(e) => e.target.value !== r.name && update.mutate({ id: r.id, name: e.target.value })} className="bg-transparent" />
              <span className="text-sm text-zinc-500">{r.fulfillment_kind === "self_serve" ? "self" : "approval"}</span>
              <input type="number" defaultValue={r.cost_points} onBlur={(e) => Number(e.target.value) !== r.cost_points && update.mutate({ id: r.id, cost_points: Number(e.target.value) })} className="w-20 text-right" />
              <button onClick={() => archive.mutate({ id: r.id })} className="text-sm text-rose-600 hover:underline">Archive</button>
            </li>
          ))}
        </ul>
      </section>
    </section>
  );
}
```

```tsx
// web/src/app/admin/rewards/page.tsx
"use client";
import { RewardsAdmin } from "@/components/screens/rewards-admin";
export default function Page() { return <RewardsAdmin />; }
```

- [ ] **Step 2: Commit**

```bash
git add web/src/components/screens/rewards-admin.tsx web/src/app/admin/rewards/page.tsx
git commit -m "feat(web): /admin/rewards catalog CRUD + pending redemption queue"
```

---

## Phase 12: Dashboard widgets + nav

### Task 29: Add Scoreboard widget + Pending-approvals badge to dashboards

**Files:**
- Modify: `web/src/components/screens/dashboard-phone.tsx`
- Modify: `web/src/components/screens/dashboard-desktop.tsx`

- [ ] **Step 1: Add nav entries (kid bottom-nav: Rewards, Scoreboard; admin nav: Points, Rewards)**

Find the nav items array in each dashboard (search for the existing Wallet/Chores entries) and append:

```tsx
{ label: "Rewards",    href: "/rewards",    icon: GiftIcon },
{ label: "Scoreboard", href: "/scoreboard", icon: TrophyIcon },
```

Admin nav in `dashboard-desktop.tsx` should add:

```tsx
{ label: "Points",  href: "/admin/points" },
{ label: "Award",   href: "/admin/points/award" },
{ label: "Rewards", href: "/admin/rewards" },
```

- [ ] **Step 2: Add the Scoreboard widget on desktop**

In `dashboard-desktop.tsx`, after the existing "Today's chores" widget block, add:

```tsx
import { Scoreboard } from "@/components/screens/scoreboard";
…
<section className="rounded-3xl bg-white border border-zinc-200 p-4">
  <h2 className="text-sm uppercase text-zinc-500 mb-2">Top kids</h2>
  <Scoreboard />
</section>
```

- [ ] **Step 3: Add Pending-approvals badge**

Use `useRedemptions({ status: "pending" })` and `useAdHocTasks({ status: "pending" })`; sum the counts; show on the parent's Admin link as `Admin (3)`.

- [ ] **Step 4: Verify dev server renders**

Run: `cd web && npm run dev` (background) and visit `/dashboard` in a browser.
Expected: nav shows new entries; scoreboard widget renders on desktop.

- [ ] **Step 5: Commit**

```bash
git add web/src/components/screens/dashboard-phone.tsx web/src/components/screens/dashboard-desktop.tsx
git commit -m "feat(web): dashboard widgets + nav for points/rewards/scoreboard"
```

---

## Phase 13: i18n strings

### Task 30: Add EN + DE strings

**Files:**
- Modify: `web/src/i18n/messages/en.json`
- Modify: `web/src/i18n/messages/de.json`

- [ ] **Step 1: Add a `points` section with the user-visible strings**

```json
{
  "points": {
    "rewards":          "Rewards",
    "scoreboard":       "Scoreboard",
    "timeline":         "Timeline",
    "pointsBalance":    "{count} pts",
    "redeem":           "Redeem",
    "request":          "Request",
    "needMore":         "Need {count} more",
    "approve":          "Approve",
    "decline":          "Decline",
    "fulfilled":        "Fulfilled",
    "savingFor":        "Saving for this",
    "saveForThis":      "Save for this",
    "redeemedToast":    "Redeemed! {count} pts spent.",
    "requestedToast":   "Request sent — waiting for parent approval."
  }
}
```

- [ ] **Step 2: German translations** (mirror keys; same structure)

- [ ] **Step 3: Commit**

```bash
git add web/src/i18n/messages/en.json web/src/i18n/messages/de.json
git commit -m "feat(i18n): EN+DE strings for points and rewards"
```

---

## Phase 14: Local Playwright e2e

### Task 31: Add `web/e2e/rewards.spec.ts`

**Files:**
- Create: `web/e2e/rewards.spec.ts`

- [ ] **Step 1: Write a kid-redeem + admin-approve happy path against fallback mode**

```ts
import { test, expect } from "@playwright/test";

test("kid can request a reward and admin can approve in fallback mode", async ({ page }) => {
  await page.goto("/rewards");
  await expect(page.getByRole("heading", { name: /Rewards/i })).toBeVisible();
  await expect(page.getByText("Stickers")).toBeVisible();

  // Click "Redeem" on the first reward (self-serve, has 47 fallback pts vs 30)
  const card = page.locator("li", { hasText: "Stickers" });
  await card.getByRole("button", { name: /Redeem/i }).click();
  await expect(page.getByRole("status")).toContainText(/Redeemed|Request sent/);

  // Admin queue
  await page.goto("/admin/rewards");
  await expect(page.getByRole("heading", { name: /Rewards Admin/i })).toBeVisible();
});
```

- [ ] **Step 2: Run**

Run: `cd web && npm run e2e -- rewards.spec.ts`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add web/e2e/rewards.spec.ts
git commit -m "test(e2e): kid redeem + admin queue happy path against fallback"
```

---

## Phase 15: Production e2e additions

### Task 32: Extend `e2e-prod` with points/rewards round-trip

**Files:**
- Modify: `web/e2e-prod/helpers/api.ts`
- Modify: `web/e2e-prod/tests/family-flow.spec.ts`

- [ ] **Step 1: Add API helpers**

In `helpers/api.ts`, after the wallet helpers, add typed wrappers:

```ts
// ── Points / rewards ────────────────────────────────────────────────────
export interface ApiPointCategoryT { id: string; name: string; color: string; }
export interface ApiBehaviorT      { id: string; category_id: string; name: string; suggested_points: number; }
export interface ApiRewardT        { id: string; name: string; cost_points: number; fulfillment_kind: "self_serve" | "needs_approval"; }
export interface ApiRedemptionT    { id: string; status: "pending" | "approved" | "fulfilled" | "declined"; points_at_redemption: number; }
export interface ApiPointsBalanceT { member_id: string; total: number; }

export const apiCreateCategory = (token: string, name: string, color: string) =>
  request<ApiPointCategoryT>("POST", "/v1/point-categories", { token, body: { name, color } });
export const apiCreateBehavior = (token: string, category_id: string, name: string, suggested_points: number) =>
  request<ApiBehaviorT>("POST", "/v1/behaviors", { token, body: { category_id, name, suggested_points } });
export const apiGrantPoints = (token: string, memberId: string, body: { behavior_id?: string; category_id?: string; points: number; reason: string }) =>
  request("POST", `/v1/points/${memberId}/grant`, { token, body });
export const apiPointsBalance = (token: string, memberId: string) =>
  request<ApiPointsBalanceT>("GET", `/v1/points/${memberId}`, { token });
export const apiCreateReward = (token: string, name: string, cost_points: number, fulfillment_kind: "self_serve" | "needs_approval") =>
  request<ApiRewardT>("POST", "/v1/rewards", { token, body: { name, cost_points, fulfillment_kind } });
export const apiRedeemReward = (token: string, rewardId: string) =>
  request<{ redemption_id: string; status: string }>("POST", `/v1/rewards/${rewardId}/redeem`, { token, body: {} });
export const apiApproveRedemption = (token: string, id: string) =>
  request<ApiRedemptionT>("POST", `/v1/redemptions/${id}/approve`, { token, body: {} });
```

- [ ] **Step 2: Append a new test block to `family-flow.spec.ts`**

```ts
test.describe("8. points + rewards round-trip", () => {
  test("create category + behavior, grant, redeem self-serve, verify balance", async () => {
    if (!token) test.skip(true, "no TIDYBOARD_TEST_TOKEN");
    // 1. category
    const cat = await apiCreateCategory(token, `[E2E-${runId}] Effort`, "#10b981");
    cleanup.push(() => request("DELETE", `/v1/point-categories/${cat.id}`, { token }));
    // 2. behavior
    const beh = await apiCreateBehavior(token, cat.id, `[E2E-${runId}] Did dishes`, 10);
    cleanup.push(() => request("DELETE", `/v1/behaviors/${beh.id}`, { token }));
    // 3. grant 25 pts to the test kid
    await apiGrantPoints(token, kid.id, { behavior_id: beh.id, category_id: cat.id, points: 25, reason: "round-trip test" });
    const bal = await apiPointsBalance(token, kid.id);
    expect(bal.total).toBeGreaterThanOrEqual(25);
    // 4. self-serve reward + redeem
    const reward = await apiCreateReward(token, `[E2E-${runId}] sticker`, 10, "self_serve");
    cleanup.push(() => request("DELETE", `/v1/rewards/${reward.id}`, { token }));
    const r = await apiRedeemReward(token, reward.id);
    expect(r.status).toBe("approved");
    const bal2 = await apiPointsBalance(token, kid.id);
    expect(bal2.total).toBe(bal.total - 10);
  });
});
```

(Reuse existing `runId`, `cleanup`, `kid`, and `token` symbols from the rest of the family-flow file.)

- [ ] **Step 3: Run locally**

Run: `cd web && TIDYBOARD_TEST_TOKEN=... npm run e2e:prod`
Expected: PASS, with cleanup leaving no `[E2E-…]` rows behind.

- [ ] **Step 4: Commit**

```bash
git add web/e2e-prod/helpers/api.ts web/e2e-prod/tests/family-flow.spec.ts
git commit -m "test(e2e-prod): points + rewards round-trip with cleanup"
```

---

## Phase 16: Deploy + verify on production

### Task 33: PR, merge, auto-deploy, smoke-verify prod

- [ ] **Step 1: Push branch + open PR**

```bash
git push -u origin <branch>
gh pr create --title "feat: behavior points + rewards (Plan B)" --body "$(cat <<'EOF'
## Summary
- Adds 7 tables for points/categories/behaviors/grants/rewards/redemptions/savings/cost-adjustments
- Adds `PointsService` + `RewardService` with EffectiveCost helper (Go + TS mirror)
- Adds 13 new endpoints under /v1
- Adds kid screens: /rewards, /scoreboard, /timeline/{member_id}
- Adds admin screens: /admin/points, /admin/points/award, /admin/rewards
- Extends e2e-prod with full points→reward redemption round-trip

## Test plan
- [ ] Backend `go test ./internal/service/... ./internal/handler/...` green
- [ ] Web `npx tsc --noEmit && npx vitest run && npx playwright test`
- [ ] e2e-prod with TIDYBOARD_TEST_TOKEN green
- [ ] Deploy job succeeds; /rewards /scoreboard return 200 on tidyboard.org
- [ ] Smoke a real redemption end-to-end through the UI

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 2: After CI green, merge to main and let auto-deploy fire**

Reference: `.github/workflows/deploy-ec2.yml` SSHes to the t4g.small, `git reset --hard origin/main`, runs `docker compose up -d --build`. Push to main = prod deploy. Watch: `gh run watch` after merge.

NOTE: the t4g.small has historically OOM'd under a full `--build`. If the deploy run fails on memory, fall back to per-service rebuild via the deploy-ec2 workflow's per-service path, or `aws ec2 reboot-instances --instance-ids <id>` and retry.

- [ ] **Step 3: Verify pages are 200**

```bash
for p in /rewards /scoreboard /admin/points /admin/points/award /admin/rewards; do
  printf '%s ' "$p"; curl -s -o /dev/null -w "%{http_code}\n" "https://tidyboard.org$p"
done
```

Expected: all 200.

- [ ] **Step 4: Verify prod e2e passes against the live deploy**

Run: `cd web && TIDYBOARD_TEST_TOKEN=... npm run e2e:prod`
Expected: 14 tests pass (7 public + 7 family-flow incl. new points round-trip).

- [ ] **Step 5: Update memory**

Add a project memory note: `Plan B shipped; points + rewards live on tidyboard.org; consider scheduling /schedule agent in 30 days to clean up any unused fallback shapes.`

---

## Self-Review

- **Spec coverage:** Tables (3.2 ✓), API surface (4.2 ✓), kid pages (5.1 ✓), admin pages (5.2 ✓), dashboard widgets (5.3 ✓), nav (5.4 ✓), shared primitives (5.5 ✓ — PointsBadge + RewardCard; StreakIndicator already in Plan A; MoneyDisplay already in Plan A), redemption flows (6.4, 6.5 ✓), cost-adjustment + savings interplay (6.6, 6.9 ✓), category rename/soft-delete (6.8 ✓), race-safe writes (atomic redeem path ✓), tests (7.1 wallet_math equivalent: points_math; 7.2 grants/redemption/effective_cost; 7.3 hooks + math; 7.4 redemption flow; 7.5 prod round-trip ✓).
- **Placeholder scan:** `ListRedemptions` handler is left as a thin pass-through pointer to the wallet ListAdHocTasks pattern — that's acceptable but should be filled in during execution; flagged with an explicit comment, not a TODO.
- **Type consistency:** All `Api*` types use snake_case JSON keys to match Go json tags; hook signatures pass camelCase TS args but post snake_case bodies (matches Plan A pattern). `EffectiveCost` (Go) and `effectiveCost` (TS) take identical `(base, adjs, now)` parameters.
- **Known carry-forward gotcha:** Plan A's `useChoreCompletions`/`useWallet` pattern uses `withFallback`; new hooks follow the same shape. Be careful: when `fallback.foo()` returns a shape that doesn't match the `Api*` type exactly, screens crash silently (per the project memory `fallback shape must match ApiX`).

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-04-26-points-rewards-implementation.md`. Two execution options:**

1. **Subagent-Driven (recommended)** — dispatch a fresh subagent per task, review between tasks, fast iteration. Best because Tasks 1–17 (backend) are independent of Tasks 18–28 (frontend) and can be parallelized.
2. **Inline Execution** — execute tasks in this session using executing-plans, batch execution with checkpoints.

**Which approach?**









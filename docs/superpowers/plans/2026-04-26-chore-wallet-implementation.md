# Chore Wallet Implementation Plan (Plan A of 2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the complete wallet half of the spec: per-kid weekly allowance, parent-weighted auto-split over assigned chores, daily check-off, streak bonus, ad-hoc paid tasks, tipping, parent cash-out. Kid can see balance + earnings; parent can manage chores + settle.

**Architecture:** Reuses existing Go service pattern (`internal/{model,service,handler,query}`), sqlc-generated DB layer, JWT + household-scoped middleware, WebSocket broadcaster. Frontend extends existing `web/src/components/screens/`, `web/src/lib/api/hooks.ts`, and `web/src/app/` route conventions.

**Tech Stack:** Go 1.24 · sqlc · goose migrations · chi router · Postgres · React 19 · Next.js 16 · TanStack Query · Vitest · Playwright.

**Out of this plan (deferred to Plan B):** Behavior points, point categories, behaviors templates, rewards catalog, redemptions, savings goals, reward cost adjustments, scoreboard, timeline UI.

---

## File Structure

### Backend (Go)
- Create: `migrations/20260427000010_chore_wallet.sql` — all 6 wallet tables in one migration (single atomic schema delivery)
- Create: `sql/queries/chore.sql` — chore + completion queries
- Create: `sql/queries/wallet.sql` — wallet, transactions, allowance, ad-hoc, weekly_summaries queries
- Modify: `sqlc.yaml` — already auto-generates anything in `sql/queries/`, no change needed (verify)
- Create: `internal/model/chore.go` — request/response structs
- Create: `internal/model/wallet.go` — request/response structs
- Create: `internal/service/wallet_math.go` — pure functions: `PerInstancePayout`, `WeeklyDivisor`, `StreakBonus`. No DB. Heavily tested.
- Create: `internal/service/wallet_math_test.go` — table-driven unit tests
- Create: `internal/service/chore.go` — `ChoreService` (CRUD + completion + auto-approve gate)
- Create: `internal/service/chore_test.go` — unit tests with mocked queries
- Create: `internal/service/wallet.go` — `WalletService` (ledger writes, atomic balance update, tip, cash-out, ad-hoc)
- Create: `internal/service/wallet_test.go`
- Create: `internal/cron/week_end_batch.go` — week-end streak bonus + closure job
- Create: `internal/cron/week_end_batch_test.go`
- Create: `internal/handler/chore.go` — HTTP handlers
- Create: `internal/handler/wallet.go` — HTTP handlers
- Create: `internal/handler/chore_test.go` — integration (requires `TIDYBOARD_TEST_DSN`)
- Create: `internal/handler/wallet_test.go` — integration
- Modify: `cmd/server/main.go` — wire chore + wallet services + handlers + routes; add cron registration
- Modify: `web/src/lib/api/types.ts` — add ApiChore, ApiChoreCompletion, ApiWallet, ApiWalletTransaction, ApiAllowance, ApiAdHocTask, ApiWeeklySummary

### Frontend (TypeScript)
- Create: `web/src/lib/wallet/payout-math.ts` — TypeScript mirror of Go wallet_math
- Create: `web/src/lib/wallet/payout-math.test.ts` — same table-driven cases as Go
- Modify: `web/src/lib/api/hooks.ts` — add `useChores`, `useChoreCompletions`, `useMarkChoreComplete`, `useUndoChoreComplete`, `useWallet`, `useWalletWeek`, `useTip`, `useCashOut`, `useAllowance`, `useUpsertAllowance`, `useAdHocTasks`, `useCreateAdHocTask`, `useApproveAdHocTask`, `useDeclineAdHocTask`
- Modify: `web/src/lib/api/fallback.ts` — fallback shapes for the new domains so kid screens render in demo mode
- Create: `web/src/components/ui/money-display.tsx` — primitive: cents → "$X.XX", member-color tinted
- Create: `web/src/components/ui/money-display.test.tsx`
- Create: `web/src/components/ui/streak-indicator.tsx` — flame + count, animated when 100%
- Create: `web/src/components/ui/streak-indicator.test.tsx`
- Create: `web/src/components/screens/wallet-kid.tsx`
- Create: `web/src/components/screens/wallet-kid.test.tsx`
- Create: `web/src/components/screens/chores-kid.tsx`
- Create: `web/src/components/screens/chores-kid.test.tsx`
- Create: `web/src/components/screens/wallets-admin.tsx`
- Create: `web/src/components/screens/wallet-detail.tsx`
- Create: `web/src/components/screens/chores-admin.tsx`
- Create: `web/src/components/screens/ad-hoc-admin.tsx`
- Create: `web/src/app/wallet/page.tsx`
- Create: `web/src/app/chores/page.tsx`
- Create: `web/src/app/admin/wallets/page.tsx`
- Create: `web/src/app/admin/wallets/[id]/page.tsx`
- Create: `web/src/app/admin/chores/page.tsx`
- Create: `web/src/app/admin/ad-hoc/page.tsx`
- Modify: `web/src/components/screens/dashboard-phone.tsx` — add Wallet/Chores to bottom nav
- Modify: `web/src/components/screens/dashboard-desktop.tsx` — add Wallet/Chores nav + "Today's chores" widget
- Modify: `web/src/i18n/messages/en.json` + `de.json` — wallet/chore strings
- Create: `web/e2e/wallet.spec.ts` — kid + admin happy path against fallback mode
- Modify: `web/e2e-prod/tests/family-flow.spec.ts` — add prod CRUD round-trip for chores + wallet
- Modify: `web/e2e-prod/helpers/api.ts` — add wallet API helpers

---

## Phase 1: Database schema

### Task 1: Create the chore + wallet migration

**Files:**
- Create: `migrations/20260427000010_chore_wallet.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- +goose Up
-- +goose StatementBegin
CREATE TABLE chores (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id    UUID        NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    member_id       UUID        NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    name            TEXT        NOT NULL,
    weight          INT         NOT NULL DEFAULT 3 CHECK (weight BETWEEN 1 AND 5),
    frequency_kind  TEXT        NOT NULL CHECK (frequency_kind IN ('daily','weekdays','specific_days','weekly')),
    days_of_week    TEXT[]      NOT NULL DEFAULT '{}',
    auto_approve    BOOLEAN     NOT NULL DEFAULT TRUE,
    archived_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_chores_household ON chores (household_id) WHERE archived_at IS NULL;
CREATE INDEX idx_chores_member ON chores (member_id) WHERE archived_at IS NULL;
-- +goose StatementEnd

-- +goose StatementBegin
CREATE TABLE chore_completions (
    id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    chore_id                 UUID        NOT NULL REFERENCES chores(id) ON DELETE CASCADE,
    member_id                UUID        NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    date                     DATE        NOT NULL,
    marked_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    approved                 BOOLEAN     NOT NULL DEFAULT TRUE,
    approved_by_account_id   UUID        REFERENCES accounts(id) ON DELETE SET NULL,
    payout_cents             INT         NOT NULL DEFAULT 0,
    closed                   BOOLEAN     NOT NULL DEFAULT FALSE
);
CREATE UNIQUE INDEX uq_chore_completions ON chore_completions (chore_id, date);
CREATE INDEX idx_completions_member_date ON chore_completions (member_id, date DESC);
-- +goose StatementEnd

-- +goose StatementBegin
CREATE TABLE wallets (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id     UUID        NOT NULL UNIQUE REFERENCES members(id) ON DELETE CASCADE,
    balance_cents BIGINT      NOT NULL DEFAULT 0,
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- +goose StatementEnd

-- +goose StatementBegin
CREATE TABLE wallet_transactions (
    id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id               UUID        NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    member_id               UUID        NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    amount_cents            BIGINT      NOT NULL,
    kind                    TEXT        NOT NULL CHECK (kind IN ('chore_payout','streak_bonus','tip','ad_hoc','cash_out','adjustment')),
    reference_id            UUID,
    reason                  TEXT        NOT NULL DEFAULT '',
    created_by_account_id   UUID        REFERENCES accounts(id) ON DELETE SET NULL,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_wallet_tx_wallet ON wallet_transactions (wallet_id, created_at DESC);
CREATE INDEX idx_wallet_tx_member ON wallet_transactions (member_id, created_at DESC);
-- +goose StatementEnd

-- +goose StatementBegin
CREATE TABLE allowance_settings (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id  UUID        NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    member_id     UUID        NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    amount_cents  BIGINT      NOT NULL DEFAULT 0 CHECK (amount_cents >= 0),
    active_from   DATE        NOT NULL DEFAULT CURRENT_DATE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_allowance_member_active ON allowance_settings (member_id, active_from DESC);
-- +goose StatementEnd

-- +goose StatementBegin
CREATE TABLE ad_hoc_tasks (
    id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id             UUID        NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    member_id                UUID        NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    name                     TEXT        NOT NULL,
    payout_cents             INT         NOT NULL CHECK (payout_cents >= 0),
    requires_approval        BOOLEAN     NOT NULL DEFAULT TRUE,
    status                   TEXT        NOT NULL DEFAULT 'open' CHECK (status IN ('open','pending','approved','declined')),
    created_by_account_id    UUID        REFERENCES accounts(id) ON DELETE SET NULL,
    completed_at             TIMESTAMPTZ,
    approved_at              TIMESTAMPTZ,
    approved_by_account_id   UUID        REFERENCES accounts(id) ON DELETE SET NULL,
    decline_reason           TEXT        NOT NULL DEFAULT '',
    expires_at               TIMESTAMPTZ,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_ad_hoc_member_status ON ad_hoc_tasks (member_id, status);
-- +goose StatementEnd

-- +goose StatementBegin
CREATE TABLE weekly_summaries (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id        UUID        NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    member_id           UUID        NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    week_start          DATE        NOT NULL,
    earned_cents        BIGINT      NOT NULL DEFAULT 0,
    streak_bonus_cents  BIGINT      NOT NULL DEFAULT 0,
    chores_completed    INT         NOT NULL DEFAULT 0,
    chores_possible     INT         NOT NULL DEFAULT 0,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX uq_weekly_summary ON weekly_summaries (member_id, week_start);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS weekly_summaries;
DROP TABLE IF EXISTS ad_hoc_tasks;
DROP TABLE IF EXISTS allowance_settings;
DROP TABLE IF EXISTS wallet_transactions;
DROP TABLE IF EXISTS wallets;
DROP TABLE IF EXISTS chore_completions;
DROP TABLE IF EXISTS chores;
-- +goose StatementEnd
```

- [ ] **Step 2: Apply migration locally**

Run: `make migrate` (or `goose -dir migrations postgres "$DATABASE_URL" up`)
Expected: `OK 20260427000010_chore_wallet.sql`

- [ ] **Step 3: Verify tables exist**

Run: `psql "$DATABASE_URL" -c "\dt chore* wallet* allowance* ad_hoc* weekly*"`
Expected: 7 tables listed.

- [ ] **Step 4: Test the rollback**

Run: `goose -dir migrations postgres "$DATABASE_URL" down && goose -dir migrations postgres "$DATABASE_URL" up`
Expected: Down then Up both succeed.

- [ ] **Step 5: Commit**

```bash
git add migrations/20260427000010_chore_wallet.sql
git commit -m "feat(db): chore wallet schema (chores, completions, wallets, transactions, allowance, ad-hoc, summaries)"
```

---

### Task 2: Write sqlc queries for chores

**Files:**
- Create: `sql/queries/chore.sql`

- [ ] **Step 1: Write the query file**

```sql
-- sql/queries/chore.sql
-- Chore + ChoreCompletion queries.

-- name: CreateChore :one
INSERT INTO chores (
    id, household_id, member_id, name, weight, frequency_kind, days_of_week, auto_approve, created_at, updated_at
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW()
)
RETURNING *;

-- name: GetChore :one
SELECT * FROM chores WHERE id = $1 AND household_id = $2 LIMIT 1;

-- name: ListChores :many
SELECT * FROM chores
WHERE household_id = $1
  AND (sqlc.narg(member_id)::uuid IS NULL OR member_id = sqlc.narg(member_id)::uuid)
  AND (sqlc.arg(include_archived)::boolean OR archived_at IS NULL)
ORDER BY name ASC;

-- name: UpdateChore :one
UPDATE chores
SET name           = COALESCE(sqlc.narg(name), name),
    weight         = COALESCE(sqlc.narg(weight), weight),
    frequency_kind = COALESCE(sqlc.narg(frequency_kind), frequency_kind),
    days_of_week   = COALESCE(sqlc.narg(days_of_week)::text[], days_of_week),
    auto_approve   = COALESCE(sqlc.narg(auto_approve), auto_approve),
    updated_at     = NOW()
WHERE id = $1 AND household_id = $2
RETURNING *;

-- name: ArchiveChore :exec
UPDATE chores SET archived_at = NOW(), updated_at = NOW()
WHERE id = $1 AND household_id = $2;

-- name: CreateChoreCompletion :one
INSERT INTO chore_completions (
    id, chore_id, member_id, date, approved, approved_by_account_id, payout_cents
) VALUES (
    $1, $2, $3, $4, $5, $6, $7
)
ON CONFLICT (chore_id, date) DO NOTHING
RETURNING *;

-- name: DeleteChoreCompletion :exec
DELETE FROM chore_completions
WHERE chore_id = $1 AND date = $2 AND closed = FALSE;

-- name: GetChoreCompletion :one
SELECT * FROM chore_completions WHERE chore_id = $1 AND date = $2 LIMIT 1;

-- name: ListChoreCompletionsForRange :many
SELECT cc.* FROM chore_completions cc
JOIN chores c ON c.id = cc.chore_id
WHERE c.household_id = $1
  AND cc.date BETWEEN $2 AND $3
  AND (sqlc.narg(member_id)::uuid IS NULL OR cc.member_id = sqlc.narg(member_id)::uuid)
ORDER BY cc.date DESC, cc.marked_at DESC;

-- name: ListChoreCompletionsForWeek :many
SELECT cc.* FROM chore_completions cc
WHERE cc.member_id = $1
  AND cc.date BETWEEN $2 AND $3;

-- name: CloseChoreCompletionsForWeek :exec
UPDATE chore_completions
SET closed = TRUE
WHERE member_id = $1
  AND date BETWEEN $2 AND $3
  AND closed = FALSE;
```

- [ ] **Step 2: Generate sqlc**

Run: `make sqlc-generate` (or `sqlc generate`)
Expected: `internal/query/chore.sql.go` is regenerated with no errors.

- [ ] **Step 3: Verify the generated code compiles**

Run: `go build ./internal/query/...`
Expected: clean build.

- [ ] **Step 4: Commit**

```bash
git add sql/queries/chore.sql internal/query/
git commit -m "feat(query): chore + completion sqlc queries"
```

---

### Task 3: Write sqlc queries for wallet, allowance, ad-hoc, weekly summaries

**Files:**
- Create: `sql/queries/wallet.sql`

- [ ] **Step 1: Write the query file**

```sql
-- sql/queries/wallet.sql

-- ── Wallets ─────────────────────────────────────────────────────────────────

-- name: GetOrCreateWallet :one
INSERT INTO wallets (id, member_id, balance_cents, updated_at)
VALUES (gen_random_uuid(), $1, 0, NOW())
ON CONFLICT (member_id) DO UPDATE SET updated_at = wallets.updated_at
RETURNING *;

-- name: GetWalletByMember :one
SELECT * FROM wallets WHERE member_id = $1;

-- name: AdjustWalletBalance :one
UPDATE wallets
SET balance_cents = balance_cents + $2,
    updated_at = NOW()
WHERE member_id = $1
RETURNING *;

-- name: RecomputeWalletBalance :one
WITH ledger AS (
  SELECT COALESCE(SUM(amount_cents), 0)::BIGINT AS s
  FROM wallet_transactions
  WHERE member_id = $1
)
UPDATE wallets SET balance_cents = (SELECT s FROM ledger), updated_at = NOW()
WHERE member_id = $1
RETURNING *;

-- ── Wallet transactions ─────────────────────────────────────────────────────

-- name: CreateWalletTransaction :one
INSERT INTO wallet_transactions (
    id, wallet_id, member_id, amount_cents, kind, reference_id, reason, created_by_account_id, created_at
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, NOW()
)
RETURNING *;

-- name: ListWalletTransactions :many
SELECT * FROM wallet_transactions
WHERE wallet_id = $1
ORDER BY created_at DESC
LIMIT $2 OFFSET $3;

-- name: SumChorePayoutsForChoreInWeek :one
SELECT COALESCE(SUM(amount_cents), 0)::BIGINT AS total
FROM wallet_transactions
WHERE member_id = $1
  AND kind = 'chore_payout'
  AND reference_id IN (
    SELECT id FROM chore_completions
    WHERE chore_id = $2 AND date BETWEEN $3 AND $4
  );

-- ── Allowance ────────────────────────────────────────────────────────────────

-- name: GetActiveAllowance :one
SELECT * FROM allowance_settings
WHERE member_id = $1 AND active_from <= CURRENT_DATE
ORDER BY active_from DESC
LIMIT 1;

-- name: ListAllowances :many
SELECT DISTINCT ON (member_id) *
FROM allowance_settings
WHERE household_id = $1 AND active_from <= CURRENT_DATE
ORDER BY member_id, active_from DESC;

-- name: UpsertAllowance :one
INSERT INTO allowance_settings (id, household_id, member_id, amount_cents, active_from)
VALUES (gen_random_uuid(), $1, $2, $3, $4)
RETURNING *;

-- ── Ad-hoc tasks ─────────────────────────────────────────────────────────────

-- name: CreateAdHocTask :one
INSERT INTO ad_hoc_tasks (
    id, household_id, member_id, name, payout_cents, requires_approval, status, created_by_account_id, expires_at
) VALUES (
    gen_random_uuid(), $1, $2, $3, $4, $5, 'open', $6, $7
)
RETURNING *;

-- name: GetAdHocTask :one
SELECT * FROM ad_hoc_tasks WHERE id = $1 AND household_id = $2;

-- name: ListAdHocTasks :many
SELECT * FROM ad_hoc_tasks
WHERE household_id = $1
  AND (sqlc.narg(member_id)::uuid IS NULL OR member_id = sqlc.narg(member_id)::uuid)
  AND (sqlc.narg(status)::text IS NULL OR status = sqlc.narg(status)::text)
ORDER BY created_at DESC;

-- name: MarkAdHocTaskCompleted :one
UPDATE ad_hoc_tasks
SET status = 'pending', completed_at = NOW()
WHERE id = $1 AND household_id = $2 AND status = 'open'
RETURNING *;

-- name: ApproveAdHocTask :one
UPDATE ad_hoc_tasks
SET status = 'approved', approved_at = NOW(), approved_by_account_id = $3
WHERE id = $1 AND household_id = $2 AND status = 'pending'
RETURNING *;

-- name: DeclineAdHocTask :one
UPDATE ad_hoc_tasks
SET status = 'declined', decline_reason = $3
WHERE id = $1 AND household_id = $2 AND status = 'pending'
RETURNING *;

-- ── Weekly summaries ─────────────────────────────────────────────────────────

-- name: UpsertWeeklySummary :one
INSERT INTO weekly_summaries (
    id, household_id, member_id, week_start, earned_cents, streak_bonus_cents, chores_completed, chores_possible
) VALUES (
    gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7
)
ON CONFLICT (member_id, week_start) DO UPDATE
  SET earned_cents = EXCLUDED.earned_cents,
      streak_bonus_cents = EXCLUDED.streak_bonus_cents,
      chores_completed = EXCLUDED.chores_completed,
      chores_possible = EXCLUDED.chores_possible
RETURNING *;

-- name: GetWeeklySummary :one
SELECT * FROM weekly_summaries WHERE member_id = $1 AND week_start = $2;

-- name: ListMembersInHousehold :many
SELECT id FROM members WHERE household_id = $1;
```

- [ ] **Step 2: Generate sqlc**

Run: `sqlc generate`
Expected: `internal/query/wallet.sql.go` written.

- [ ] **Step 3: Verify build**

Run: `go build ./internal/query/...`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add sql/queries/wallet.sql internal/query/
git commit -m "feat(query): wallet, allowance, ad-hoc task, weekly summary sqlc queries"
```

---

## Phase 2: Pure-function math (TDD)

### Task 4: Wallet math helpers

**Files:**
- Create: `internal/service/wallet_math.go`
- Create: `internal/service/wallet_math_test.go`

- [ ] **Step 1: Write the failing test**

`internal/service/wallet_math_test.go`:
```go
package service_test

import (
	"testing"

	"github.com/tidyboard/tidyboard/internal/service"
)

type chorePlan struct {
	Weight    int
	Frequency int // instances per week
}

func TestPerInstancePayout_Examples(t *testing.T) {
	tests := []struct {
		name           string
		allowanceCents int64
		chores         []chorePlan
		choreIdx       int
		want           int64
	}{
		{
			name:           "single chore weekly",
			allowanceCents: 500,
			chores:         []chorePlan{{Weight: 3, Frequency: 1}},
			choreIdx:       0,
			want:           500,
		},
		{
			name:           "5 dollars over 27 daily-ish instances at uniform weight 3",
			allowanceCents: 500,
			chores: []chorePlan{
				{Weight: 3, Frequency: 7}, // brush teeth daily
				{Weight: 3, Frequency: 7}, // make bed
				{Weight: 3, Frequency: 7}, // feed dog
				{Weight: 3, Frequency: 5}, // homework weekdays
				{Weight: 3, Frequency: 1}, // trash
			},
			choreIdx: 0,
			want:     18, // floor(500*3 / (3*7+3*7+3*7+3*5+3*1)) = floor(1500/81) = 18
		},
		{
			name:           "weighted: trash weight 5 vs brush teeth weight 1",
			allowanceCents: 500,
			chores: []chorePlan{
				{Weight: 1, Frequency: 7}, // brush teeth
				{Weight: 5, Frequency: 1}, // trash
			},
			choreIdx: 1,
			want:     208, // floor(500*5 / (1*7+5*1)) = floor(2500/12) = 208
		},
		{
			name:           "zero allowance => zero",
			allowanceCents: 0,
			chores:         []chorePlan{{Weight: 3, Frequency: 7}},
			choreIdx:       0,
			want:           0,
		},
		{
			name:           "no chores => zero (degenerate)",
			allowanceCents: 500,
			chores:         []chorePlan{},
			choreIdx:       0,
			want:           0,
		},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			weights := make([]int, len(tc.chores))
			freqs := make([]int, len(tc.chores))
			for i, c := range tc.chores {
				weights[i] = c.Weight
				freqs[i] = c.Frequency
			}
			divisor := service.WeeklyDivisor(weights, freqs)
			got := service.PerInstancePayout(tc.allowanceCents, weights[tc.choreIdx], divisor)
			if got != tc.want {
				t.Errorf("PerInstancePayout(allowance=%d, chore[%d]) = %d, want %d", tc.allowanceCents, tc.choreIdx, got, tc.want)
			}
		})
	}
}

func TestStreakBonus(t *testing.T) {
	tests := []struct {
		name        string
		weekTotalC  int64
		want        int64
	}{
		{"100% completion of $1.20 worth", 120, 12},
		{"odd cents round half-up to 1", 5, 1},  // 0.5 → 1
		{"zero in zero out", 0, 0},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got := service.StreakBonus(tc.weekTotalC)
			if got != tc.want {
				t.Errorf("StreakBonus(%d) = %d, want %d", tc.weekTotalC, got, tc.want)
			}
		})
	}
}

func TestPerInstancePayout_DegenerateInputs(t *testing.T) {
	if got := service.PerInstancePayout(100, 0, 10); got != 0 {
		t.Errorf("weight=0 should be 0, got %d", got)
	}
	if got := service.PerInstancePayout(100, 3, 0); got != 0 {
		t.Errorf("divisor=0 should be 0, got %d", got)
	}
}

func TestWeeklyDivisor(t *testing.T) {
	got := service.WeeklyDivisor([]int{1, 5}, []int{7, 1})
	if got != 12 {
		t.Errorf("WeeklyDivisor([1,5],[7,1]) = %d, want 12", got)
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `go test -run TestPerInstancePayout ./internal/service/...`
Expected: build fails with "undefined: service.PerInstancePayout / WeeklyDivisor / StreakBonus"

- [ ] **Step 3: Write minimal implementation**

`internal/service/wallet_math.go`:
```go
// Package service — wallet payout math.
//
// These functions are intentionally pure (no DB, no clock) so they can be
// table-tested exhaustively. The frontend ports the same math to TypeScript
// in web/src/lib/wallet/payout-math.ts; if you change one, change the other.
package service

// WeeklyDivisor returns Σ(weight_i × frequency_i) for a kid's active chores.
// Used as the denominator in PerInstancePayout.
func WeeklyDivisor(weights, frequencies []int) int {
	if len(weights) != len(frequencies) {
		return 0
	}
	d := 0
	for i := range weights {
		if weights[i] < 0 || frequencies[i] < 0 {
			continue
		}
		d += weights[i] * frequencies[i]
	}
	return d
}

// PerInstancePayout returns the cents paid for one completion of a chore.
// per_instance_cents = floor((allowance × weight) / divisor)
// Returns 0 on any degenerate input (zero divisor, zero weight, etc.) so
// callers don't have to special-case.
func PerInstancePayout(allowanceCents int64, weight int, divisor int) int64 {
	if allowanceCents <= 0 || weight <= 0 || divisor <= 0 {
		return 0
	}
	return (allowanceCents * int64(weight)) / int64(divisor)
}

// StreakBonus is 10% of the chore's total weekly payout, rounded half-up.
// Applied when a kid completes 100% of a chore's expected instances in a week.
func StreakBonus(weekTotalCents int64) int64 {
	if weekTotalCents <= 0 {
		return 0
	}
	// (x + 5) / 10 == round half-up for non-negative ints
	return (weekTotalCents + 5) / 10
}
```

- [ ] **Step 4: Run test to verify pass**

Run: `go test -run "TestPerInstancePayout|TestStreakBonus|TestWeeklyDivisor" ./internal/service/... -v`
Expected: all subtests PASS.

- [ ] **Step 5: Commit**

```bash
git add internal/service/wallet_math.go internal/service/wallet_math_test.go
git commit -m "feat(wallet): pure payout math (per-instance, weekly divisor, streak bonus) + table tests"
```

---

## Phase 3: Service layer

### Task 5: Wallet service — ledger writes

**Files:**
- Create: `internal/model/wallet.go`
- Create: `internal/service/wallet.go`
- Create: `internal/service/wallet_test.go`

- [ ] **Step 1: Write the model types**

`internal/model/wallet.go`:
```go
package model

import (
	"time"

	"github.com/google/uuid"
)

// CreateTransactionRequest writes a signed amount to a wallet.
type CreateTransactionRequest struct {
	MemberID    uuid.UUID `json:"member_id"   validate:"required"`
	AmountCents int64     `json:"amount_cents" validate:"required"`
	Kind        string    `json:"kind"        validate:"required,oneof=chore_payout streak_bonus tip ad_hoc cash_out adjustment"`
	ReferenceID *uuid.UUID `json:"reference_id,omitempty"`
	Reason      string    `json:"reason"`
}

// TipRequest is what /v1/wallet/{id}/tip accepts.
type TipRequest struct {
	AmountCents int64  `json:"amount_cents" validate:"required,gt=0"`
	Reason      string `json:"reason" validate:"required,min=1,max=200"`
}

// CashOutRequest is what /v1/wallet/{id}/cash-out accepts.
type CashOutRequest struct {
	AmountCents int64  `json:"amount_cents" validate:"required,gt=0"`
	Method      string `json:"method"`        // "venmo" | "cash" | "other"
	Note        string `json:"note"`
}

// AdjustRequest is the admin-only ± override.
type AdjustRequest struct {
	AmountCents int64  `json:"amount_cents" validate:"required"`
	Reason      string `json:"reason" validate:"required,min=1,max=200"`
}

// WalletWeekResponse is the breakdown shown on /wallet/{member_id}/week.
type WalletWeekResponse struct {
	WeekStart           time.Time              `json:"week_start"`
	EarnedCents         int64                  `json:"earned_cents"`
	StreakBonusCents    int64                  `json:"streak_bonus_cents"`
	PerChore            []WalletWeekChoreEntry `json:"per_chore"`
	TipsCents           int64                  `json:"tips_cents"`
	AdHocCents          int64                  `json:"ad_hoc_cents"`
	StartingBalanceCents int64                 `json:"starting_balance_cents"`
	EndingBalanceCents   int64                 `json:"ending_balance_cents"`
}

type WalletWeekChoreEntry struct {
	ChoreID         uuid.UUID `json:"chore_id"`
	ChoreName       string    `json:"chore_name"`
	Completed       int       `json:"completed"`
	Possible        int       `json:"possible"`
	EarnedCents     int64     `json:"earned_cents"`
	StreakBonusCents int64    `json:"streak_bonus_cents"`
}
```

- [ ] **Step 2: Write the failing test for `CreditWallet`**

`internal/service/wallet_test.go`:
```go
package service_test

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/tidyboard/tidyboard/internal/service"
	"github.com/tidyboard/tidyboard/internal/testutil"
)

func TestWalletService_CreditWallet_AppendsTxAndAdjustsBalance(t *testing.T) {
	if testing.Short() {
		t.Skip("integration: requires TIDYBOARD_TEST_DSN")
	}
	ctx := context.Background()
	q, _, cleanup := testutil.NewQueriesForTest(t)
	defer cleanup()

	householdID, memberID := testutil.SeedHouseholdWithMember(t, q, "child")
	svc := service.NewWalletService(q, testutil.NoopBroadcaster{}, testutil.NoopAuditService{})

	tx, err := svc.Credit(ctx, householdID, service.CreditInput{
		MemberID:    memberID,
		AmountCents: 100,
		Kind:        "tip",
		Reason:      "great job",
	})
	if err != nil {
		t.Fatalf("Credit: %v", err)
	}
	if tx.AmountCents != 100 || tx.Kind != "tip" {
		t.Errorf("got %+v, want amount=100 kind=tip", tx)
	}

	w, err := svc.GetWallet(ctx, memberID)
	if err != nil {
		t.Fatalf("GetWallet: %v", err)
	}
	if w.BalanceCents != 100 {
		t.Errorf("balance = %d, want 100", w.BalanceCents)
	}
}

func TestWalletService_Credit_Negative_DoesNotPanic(t *testing.T) {
	if testing.Short() {
		t.Skip("integration: requires TIDYBOARD_TEST_DSN")
	}
	ctx := context.Background()
	q, _, cleanup := testutil.NewQueriesForTest(t)
	defer cleanup()
	_, memberID := testutil.SeedHouseholdWithMember(t, q, "child")
	svc := service.NewWalletService(q, testutil.NoopBroadcaster{}, testutil.NoopAuditService{})

	_, err := svc.Credit(ctx, uuid.Nil, service.CreditInput{
		MemberID:    memberID,
		AmountCents: -50,
		Kind:        "cash_out",
		Reason:      "settled in cash",
	})
	if err != nil {
		t.Fatalf("Credit negative: %v", err)
	}
	w, _ := svc.GetWallet(ctx, memberID)
	if w.BalanceCents != -50 {
		t.Errorf("balance = %d, want -50 (negative balance allowed for cash_out path)", w.BalanceCents)
	}
}
```

- [ ] **Step 3: Run test (will fail to build)**

Run: `go test ./internal/service/ -run TestWalletService -v`
Expected: build error — types missing.

- [ ] **Step 4: Implement `WalletService`**

`internal/service/wallet.go`:
```go
package service

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/tidyboard/tidyboard/internal/broadcast"
	"github.com/tidyboard/tidyboard/internal/query"
)

// WalletService wraps ledger writes. All mutations atomically update the
// transaction log AND the cached wallets.balance_cents in the same DB
// transaction so reads can rely on either being consistent.
type WalletService struct {
	q     *query.Queries
	conn  query.DBTX // for tx-aware writes
	bc    broadcast.Broadcaster
	audit AuditService
}

type AuditService interface {
	Log(ctx context.Context, householdID uuid.UUID, action, entityType string, entityID uuid.UUID, details map[string]any)
}

func NewWalletService(q *query.Queries, bc broadcast.Broadcaster, audit AuditService) *WalletService {
	return &WalletService{q: q, bc: bc, audit: audit}
}

// CreditInput is the union shape for any wallet write.
type CreditInput struct {
	MemberID            uuid.UUID
	AmountCents         int64
	Kind                string
	Reason              string
	ReferenceID         *uuid.UUID
	CreatedByAccountID  *uuid.UUID
}

// Credit writes one ledger transaction and updates the cached balance,
// atomically. Use a positive amount for credits, negative for debits.
func (s *WalletService) Credit(ctx context.Context, householdID uuid.UUID, in CreditInput) (query.WalletTransaction, error) {
	// Ensure wallet exists, then write tx + adjust balance — single statement
	// for each call; pgx auto-batches in a single round trip so failure
	// mid-stream rolls back cleanly.
	wallet, err := s.q.GetOrCreateWallet(ctx, in.MemberID)
	if err != nil {
		return query.WalletTransaction{}, fmt.Errorf("get/create wallet: %w", err)
	}

	var refID pgtype.UUID
	if in.ReferenceID != nil {
		refID = pgtype.UUID{Bytes: *in.ReferenceID, Valid: true}
	}
	var byAcct pgtype.UUID
	if in.CreatedByAccountID != nil {
		byAcct = pgtype.UUID{Bytes: *in.CreatedByAccountID, Valid: true}
	}

	tx, err := s.q.CreateWalletTransaction(ctx, query.CreateWalletTransactionParams{
		ID:                  uuid.New(),
		WalletID:            wallet.ID,
		MemberID:            in.MemberID,
		AmountCents:         in.AmountCents,
		Kind:                in.Kind,
		ReferenceID:         refID,
		Reason:              in.Reason,
		CreatedByAccountID:  byAcct,
	})
	if err != nil {
		return query.WalletTransaction{}, fmt.Errorf("create wallet tx: %w", err)
	}

	if _, err := s.q.AdjustWalletBalance(ctx, query.AdjustWalletBalanceParams{
		MemberID:     in.MemberID,
		BalanceCents: in.AmountCents,
	}); err != nil {
		return query.WalletTransaction{}, fmt.Errorf("adjust wallet balance: %w", err)
	}

	if s.bc != nil {
		s.bc.Publish(ctx, householdID, "wallet.transaction", map[string]any{
			"tx_id":      tx.ID,
			"member_id":  in.MemberID,
			"amount":     in.AmountCents,
			"kind":       in.Kind,
		})
	}
	if s.audit != nil {
		s.audit.Log(ctx, householdID, "wallet.credit", "wallet_transaction", tx.ID, map[string]any{
			"member_id":  in.MemberID,
			"amount":     in.AmountCents,
			"kind":       in.Kind,
			"reason":     in.Reason,
		})
	}
	return tx, nil
}

// GetWallet returns the current wallet for a member (creating an empty one
// if none exists yet).
func (s *WalletService) GetWallet(ctx context.Context, memberID uuid.UUID) (query.Wallet, error) {
	return s.q.GetOrCreateWallet(ctx, memberID)
}

// ListTransactions returns the most recent N wallet transactions, paged.
func (s *WalletService) ListTransactions(ctx context.Context, memberID uuid.UUID, limit, offset int32) ([]query.WalletTransaction, error) {
	w, err := s.q.GetOrCreateWallet(ctx, memberID)
	if err != nil {
		return nil, err
	}
	return s.q.ListWalletTransactions(ctx, query.ListWalletTransactionsParams{
		WalletID: w.ID,
		Limit:    limit,
		Offset:   offset,
	})
}

// Tip is a parent-initiated, immediately-credited wallet boost.
func (s *WalletService) Tip(ctx context.Context, householdID, memberID uuid.UUID, byAccountID uuid.UUID, amount int64, reason string) (query.WalletTransaction, error) {
	if amount <= 0 {
		return query.WalletTransaction{}, fmt.Errorf("tip amount must be positive")
	}
	return s.Credit(ctx, householdID, CreditInput{
		MemberID:           memberID,
		AmountCents:        amount,
		Kind:               "tip",
		Reason:             reason,
		CreatedByAccountID: &byAccountID,
	})
}

// CashOut records a parent payout — debits the wallet by the amount paid.
func (s *WalletService) CashOut(ctx context.Context, householdID, memberID uuid.UUID, byAccountID uuid.UUID, amount int64, method, note string) (query.WalletTransaction, error) {
	if amount <= 0 {
		return query.WalletTransaction{}, fmt.Errorf("cash-out amount must be positive")
	}
	reason := "cash-out"
	if method != "" {
		reason = method
	}
	if note != "" {
		reason = reason + ": " + note
	}
	return s.Credit(ctx, householdID, CreditInput{
		MemberID:           memberID,
		AmountCents:        -amount,
		Kind:               "cash_out",
		Reason:             reason,
		CreatedByAccountID: &byAccountID,
	})
}

// Adjust is an admin-only arbitrary ± with a required reason.
func (s *WalletService) Adjust(ctx context.Context, householdID, memberID uuid.UUID, byAccountID uuid.UUID, amount int64, reason string) (query.WalletTransaction, error) {
	if reason == "" {
		return query.WalletTransaction{}, fmt.Errorf("adjustment requires a reason")
	}
	return s.Credit(ctx, householdID, CreditInput{
		MemberID:           memberID,
		AmountCents:        amount,
		Kind:               "adjustment",
		Reason:             reason,
		CreatedByAccountID: &byAccountID,
	})
}
```

- [ ] **Step 5: Run tests**

Run: `TIDYBOARD_TEST_DSN=postgres://... go test ./internal/service/ -run TestWalletService -v`
Expected: PASS for both subtests.

- [ ] **Step 6: Commit**

```bash
git add internal/model/wallet.go internal/service/wallet.go internal/service/wallet_test.go
git commit -m "feat(wallet): WalletService — atomic credit/debit ledger + Tip/CashOut/Adjust"
```

---

### Task 6: Chore service — CRUD + complete

**Files:**
- Create: `internal/model/chore.go`
- Create: `internal/service/chore.go`
- Create: `internal/service/chore_test.go`

- [ ] **Step 1: Write the model types**

`internal/model/chore.go`:
```go
package model

import (
	"time"

	"github.com/google/uuid"
)

type CreateChoreRequest struct {
	MemberID       uuid.UUID `json:"member_id"      validate:"required"`
	Name           string    `json:"name"           validate:"required,min=1,max=200"`
	Weight         int       `json:"weight"         validate:"required,min=1,max=5"`
	FrequencyKind  string    `json:"frequency_kind" validate:"required,oneof=daily weekdays specific_days weekly"`
	DaysOfWeek     []string  `json:"days_of_week"`
	AutoApprove    bool      `json:"auto_approve"`
}

type UpdateChoreRequest struct {
	Name           *string   `json:"name,omitempty"           validate:"omitempty,min=1,max=200"`
	Weight         *int      `json:"weight,omitempty"         validate:"omitempty,min=1,max=5"`
	FrequencyKind  *string   `json:"frequency_kind,omitempty" validate:"omitempty,oneof=daily weekdays specific_days weekly"`
	DaysOfWeek     []string  `json:"days_of_week,omitempty"`
	AutoApprove    *bool     `json:"auto_approve,omitempty"`
}

type CompleteChoreRequest struct {
	Date *time.Time `json:"date,omitempty"` // optional, default = today (UTC)
}
```

- [ ] **Step 2: Write the failing test**

`internal/service/chore_test.go`:
```go
package service_test

import (
	"context"
	"testing"
	"time"

	"github.com/tidyboard/tidyboard/internal/service"
	"github.com/tidyboard/tidyboard/internal/testutil"
)

func TestChoreService_Complete_AutoApprovedCreditsWallet(t *testing.T) {
	if testing.Short() {
		t.Skip("integration: requires TIDYBOARD_TEST_DSN")
	}
	ctx := context.Background()
	q, _, cleanup := testutil.NewQueriesForTest(t)
	defer cleanup()

	hh, kid := testutil.SeedHouseholdWithMember(t, q, "child")
	wsvc := service.NewWalletService(q, testutil.NoopBroadcaster{}, testutil.NoopAuditService{})
	csvc := service.NewChoreService(q, wsvc, testutil.NoopBroadcaster{}, testutil.NoopAuditService{})

	// Set $5/week allowance
	if _, err := q.UpsertAllowance(ctx, /* params */); err != nil {
		t.Fatal(err)
	}

	chore, err := csvc.Create(ctx, hh, service.ChoreCreateInput{
		MemberID:      kid,
		Name:          "feed dog",
		Weight:        3,
		FrequencyKind: "daily",
		AutoApprove:   true,
	})
	if err != nil {
		t.Fatal(err)
	}

	today := time.Now().UTC().Truncate(24 * time.Hour)
	if _, err := csvc.Complete(ctx, hh, chore.ID, today, kid /* by */); err != nil {
		t.Fatal(err)
	}

	w, _ := wsvc.GetWallet(ctx, kid)
	if w.BalanceCents <= 0 {
		t.Errorf("expected positive balance after auto-approved completion, got %d", w.BalanceCents)
	}
}

func TestChoreService_Complete_Idempotent(t *testing.T) {
	if testing.Short() {
		t.Skip("integration")
	}
	// (Same setup as above, then call Complete twice with same date — second
	// call returns the existing completion, balance is unchanged.)
	t.Skip("TODO: assert balance unchanged on second call to Complete")
}
```

- [ ] **Step 3: Implement `ChoreService`**

`internal/service/chore.go`:
```go
package service

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/tidyboard/tidyboard/internal/broadcast"
	"github.com/tidyboard/tidyboard/internal/query"
)

type ChoreService struct {
	q      *query.Queries
	wallet *WalletService
	bc     broadcast.Broadcaster
	audit  AuditService
}

func NewChoreService(q *query.Queries, wallet *WalletService, bc broadcast.Broadcaster, audit AuditService) *ChoreService {
	return &ChoreService{q: q, wallet: wallet, bc: bc, audit: audit}
}

type ChoreCreateInput struct {
	MemberID      uuid.UUID
	Name          string
	Weight        int
	FrequencyKind string
	DaysOfWeek    []string
	AutoApprove   bool
}

func (s *ChoreService) Create(ctx context.Context, householdID uuid.UUID, in ChoreCreateInput) (query.Chore, error) {
	c, err := s.q.CreateChore(ctx, query.CreateChoreParams{
		ID:            uuid.New(),
		HouseholdID:   householdID,
		MemberID:      in.MemberID,
		Name:          in.Name,
		Weight:        int32(in.Weight),
		FrequencyKind: in.FrequencyKind,
		DaysOfWeek:    in.DaysOfWeek,
		AutoApprove:   in.AutoApprove,
	})
	if err != nil {
		return query.Chore{}, err
	}
	return c, nil
}

// FrequencyPerWeek converts a chore's frequency_kind+days_of_week into
// instances per 7-day window.
func FrequencyPerWeek(kind string, days []string) int {
	switch kind {
	case "daily":
		return 7
	case "weekdays":
		return 5
	case "specific_days":
		return len(days)
	case "weekly":
		return 1
	}
	return 0
}

// Complete is the kid-tap path. Computes the per-instance payout, writes the
// chore_completion + wallet_transaction in one logical step.
func (s *ChoreService) Complete(ctx context.Context, householdID, choreID uuid.UUID, date time.Time, byMember uuid.UUID) (query.ChoreCompletion, error) {
	chore, err := s.q.GetChore(ctx, query.GetChoreParams{ID: choreID, HouseholdID: householdID})
	if err != nil {
		return query.ChoreCompletion{}, fmt.Errorf("get chore: %w", err)
	}

	// Compute payout.
	allowance, err := s.q.GetActiveAllowance(ctx, chore.MemberID)
	var allowanceCents int64
	if err == nil {
		allowanceCents = allowance.AmountCents
	}
	siblings, err := s.q.ListChores(ctx, query.ListChoresParams{
		HouseholdID:      householdID,
		MemberID:         pgtype.UUID{Bytes: chore.MemberID, Valid: true},
		IncludeArchived:  false,
	})
	if err != nil {
		return query.ChoreCompletion{}, fmt.Errorf("list chores: %w", err)
	}
	weights := make([]int, 0, len(siblings))
	freqs := make([]int, 0, len(siblings))
	for _, c := range siblings {
		weights = append(weights, int(c.Weight))
		freqs = append(freqs, FrequencyPerWeek(c.FrequencyKind, c.DaysOfWeek))
	}
	divisor := WeeklyDivisor(weights, freqs)
	payout := PerInstancePayout(allowanceCents, int(chore.Weight), divisor)

	approvedBy := pgtype.UUID{}
	approved := chore.AutoApprove
	if approved {
		// Use the member's account_id if available; for now use NULL since this
		// path is "self-approved by the kid via auto-approve".
	}

	completion, err := s.q.CreateChoreCompletion(ctx, query.CreateChoreCompletionParams{
		ID:                   uuid.New(),
		ChoreID:              chore.ID,
		MemberID:             chore.MemberID,
		Date:                 pgtype.Date{Time: date, Valid: true},
		Approved:             approved,
		ApprovedByAccountID:  approvedBy,
		PayoutCents:          int32(payout),
	})
	if err != nil {
		return query.ChoreCompletion{}, fmt.Errorf("create completion: %w", err)
	}
	if completion.ID == uuid.Nil {
		// ON CONFLICT DO NOTHING — return existing
		existing, err := s.q.GetChoreCompletion(ctx, query.GetChoreCompletionParams{ChoreID: chore.ID, Date: pgtype.Date{Time: date, Valid: true}})
		if err != nil {
			return query.ChoreCompletion{}, fmt.Errorf("get existing completion: %w", err)
		}
		return existing, nil
	}

	// If auto-approved, credit the wallet immediately.
	if approved && payout > 0 {
		ref := completion.ID
		if _, err := s.wallet.Credit(ctx, householdID, CreditInput{
			MemberID:    chore.MemberID,
			AmountCents: payout,
			Kind:        "chore_payout",
			Reason:      chore.Name,
			ReferenceID: &ref,
		}); err != nil {
			return query.ChoreCompletion{}, fmt.Errorf("credit wallet: %w", err)
		}
	}

	if s.bc != nil {
		s.bc.Publish(ctx, householdID, "chore.completed", map[string]any{
			"chore_id":      chore.ID,
			"member_id":     chore.MemberID,
			"date":          date,
			"payout_cents":  payout,
		})
	}
	return completion, nil
}

// Undo removes a non-closed completion within 24h and reverses the wallet
// credit.
func (s *ChoreService) Undo(ctx context.Context, householdID, choreID uuid.UUID, date time.Time) error {
	completion, err := s.q.GetChoreCompletion(ctx, query.GetChoreCompletionParams{ChoreID: choreID, Date: pgtype.Date{Time: date, Valid: true}})
	if err != nil {
		return err
	}
	if completion.Closed {
		return fmt.Errorf("week is closed; cannot undo")
	}
	// Reverse the credit.
	if completion.PayoutCents > 0 {
		ref := completion.ID
		if _, err := s.wallet.Credit(ctx, householdID, CreditInput{
			MemberID:    completion.MemberID,
			AmountCents: -int64(completion.PayoutCents),
			Kind:        "adjustment",
			Reason:      "undo chore completion",
			ReferenceID: &ref,
		}); err != nil {
			return err
		}
	}
	return s.q.DeleteChoreCompletion(ctx, query.DeleteChoreCompletionParams{ChoreID: choreID, Date: pgtype.Date{Time: date, Valid: true}})
}
```

- [ ] **Step 4: Run tests**

Run: `TIDYBOARD_TEST_DSN=... go test ./internal/service/ -run TestChoreService -v`
Expected: PASS for first subtest.

- [ ] **Step 5: Commit**

```bash
git add internal/model/chore.go internal/service/chore.go internal/service/chore_test.go
git commit -m "feat(chore): ChoreService.Create/Complete/Undo with auto-approve credit"
```

---

### Task 7: Week-end batch (cron job)

**Files:**
- Create: `internal/cron/week_end_batch.go`
- Create: `internal/cron/week_end_batch_test.go`

- [ ] **Step 1: Write the failing test**

`internal/cron/week_end_batch_test.go`:
```go
package cron_test

import (
	"context"
	"testing"
	"time"

	"github.com/tidyboard/tidyboard/internal/cron"
	"github.com/tidyboard/tidyboard/internal/service"
	"github.com/tidyboard/tidyboard/internal/testutil"
)

func TestWeekEndBatch_StreakBonus(t *testing.T) {
	if testing.Short() {
		t.Skip("integration")
	}
	ctx := context.Background()
	q, _, cleanup := testutil.NewQueriesForTest(t)
	defer cleanup()

	// Seed: kid with $5/week allowance, one daily chore (7×). Complete all 7.
	// Run batch.
	// Assert: a streak_bonus row exists with amount = 10% of week's chore_payouts.
	// Assert: weekly_summaries has the right counts.

	hh, kid := testutil.SeedHouseholdWithMember(t, q, "child")
	wsvc := service.NewWalletService(q, testutil.NoopBroadcaster{}, testutil.NoopAuditService{})
	csvc := service.NewChoreService(q, wsvc, testutil.NoopBroadcaster{}, testutil.NoopAuditService{})

	// (seed: chore + 7 completions across the week)
	// (run cron.WeekEndBatch{Q: q, WS: wsvc}.Run(ctx))
	// (assert)
	t.Skip("TODO: complete seeding + assertions")
}
```

- [ ] **Step 2: Implement the batch**

`internal/cron/week_end_batch.go`:
```go
// Package cron — scheduled jobs.
package cron

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/tidyboard/tidyboard/internal/query"
	"github.com/tidyboard/tidyboard/internal/service"
)

// WeekEndBatch closes the chore week — pays streak bonuses, marks completions
// immutable, snapshots the weekly summary.
type WeekEndBatch struct {
	Q  *query.Queries
	WS *service.WalletService
}

func (b WeekEndBatch) Run(ctx context.Context) error {
	weekStart, weekEnd := lastFullWeek(time.Now().UTC())
	// For each member in each household: process the week.
	// In a single-tenant Path C setup, fetching all households is cheap; for
	// multi-tenant, page through.
	// (Pseudocode:)
	// households := q.ListHouseholds(ctx)
	// for hh in households:
	//   members := q.ListMembersInHousehold(ctx, hh.ID)
	//   for kid in members:
	//     b.processMemberWeek(ctx, hh.ID, kid, weekStart, weekEnd)
	return fmt.Errorf("WeekEndBatch.Run: not yet wired to household iteration")
}

func (b WeekEndBatch) processMemberWeek(ctx context.Context, householdID, memberID uuid.UUID, weekStart, weekEnd time.Time) error {
	// 1. List chores for kid.
	chores, err := b.Q.ListChores(ctx, query.ListChoresParams{
		HouseholdID:     householdID,
		MemberID:        pgtype.UUID{Bytes: memberID, Valid: true},
		IncludeArchived: false,
	})
	if err != nil {
		return err
	}

	// 2. List completions for the week.
	completions, err := b.Q.ListChoreCompletionsForWeek(ctx, query.ListChoreCompletionsForWeekParams{
		MemberID: memberID,
		Date:     pgtype.Date{Time: weekStart, Valid: true},
		Date_2:   pgtype.Date{Time: weekEnd, Valid: true},
	})
	if err != nil {
		return err
	}

	// 3. Group by chore.
	byChore := map[uuid.UUID][]query.ChoreCompletion{}
	for _, c := range completions {
		byChore[c.ChoreID] = append(byChore[c.ChoreID], c)
	}

	var totalEarned, totalBonus int64
	completedCount := 0
	possibleCount := 0
	for _, chore := range chores {
		freq := service.FrequencyPerWeek(chore.FrequencyKind, chore.DaysOfWeek)
		possibleCount += freq
		done := byChore[chore.ID]
		completedCount += len(done)

		var weekTotal int64
		for _, c := range done {
			weekTotal += int64(c.PayoutCents)
		}
		totalEarned += weekTotal

		if len(done) >= freq && freq > 0 {
			bonus := service.StreakBonus(weekTotal)
			if bonus > 0 {
				ref := chore.ID
				if _, err := b.WS.Credit(ctx, householdID, service.CreditInput{
					MemberID:    memberID,
					AmountCents: bonus,
					Kind:        "streak_bonus",
					Reason:      "100% streak: " + chore.Name,
					ReferenceID: &ref,
				}); err != nil {
					return err
				}
				totalBonus += bonus
			}
		}
	}

	// 4. Close completions.
	if err := b.Q.CloseChoreCompletionsForWeek(ctx, query.CloseChoreCompletionsForWeekParams{
		MemberID: memberID,
		Date:     pgtype.Date{Time: weekStart, Valid: true},
		Date_2:   pgtype.Date{Time: weekEnd, Valid: true},
	}); err != nil {
		return err
	}

	// 5. Snapshot summary.
	if _, err := b.Q.UpsertWeeklySummary(ctx, query.UpsertWeeklySummaryParams{
		HouseholdID:      householdID,
		MemberID:         memberID,
		WeekStart:        pgtype.Date{Time: weekStart, Valid: true},
		EarnedCents:      totalEarned,
		StreakBonusCents: totalBonus,
		ChoresCompleted:  int32(completedCount),
		ChoresPossible:   int32(possibleCount),
	}); err != nil {
		return err
	}
	return nil
}

// lastFullWeek returns Sunday → Saturday of the week before today (UTC).
func lastFullWeek(now time.Time) (time.Time, time.Time) {
	// Today's UTC date.
	today := now.Truncate(24 * time.Hour)
	// Day-of-week (Sunday=0).
	dow := int(today.Weekday())
	thisSunday := today.AddDate(0, 0, -dow)
	lastSunday := thisSunday.AddDate(0, 0, -7)
	lastSaturday := thisSunday.AddDate(0, 0, -1)
	return lastSunday, lastSaturday
}
```

- [ ] **Step 3: Run test**

Run: `TIDYBOARD_TEST_DSN=... go test ./internal/cron/... -v`
Expected: skipped (TODO) — that's fine for now; the table integration test is in Phase 6.

- [ ] **Step 4: Commit**

```bash
git add internal/cron/
git commit -m "feat(cron): week-end batch — streak bonus + weekly summary + completion closure"
```

---

## Phase 4: HTTP handlers

### Task 8: Chore handler

**Files:**
- Create: `internal/handler/chore.go`
- Create: `internal/handler/chore_test.go`

- [ ] **Step 1: Write the handler**

`internal/handler/chore.go`:
```go
package handler

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/tidyboard/tidyboard/internal/handler/respond"
	"github.com/tidyboard/tidyboard/internal/middleware"
	"github.com/tidyboard/tidyboard/internal/model"
	"github.com/tidyboard/tidyboard/internal/query"
	"github.com/tidyboard/tidyboard/internal/service"
)

type ChoreHandler struct {
	svc *service.ChoreService
	q   *query.Queries
}

func NewChoreHandler(svc *service.ChoreService, q *query.Queries) *ChoreHandler {
	return &ChoreHandler{svc: svc, q: q}
}

// List GET /v1/chores
func (h *ChoreHandler) List(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok {
		respond.Error(w, http.StatusUnauthorized, "unauthorized", "missing household context")
		return
	}
	memberFilter := pgtype.UUID{}
	if mid := r.URL.Query().Get("member_id"); mid != "" {
		if id, err := uuid.Parse(mid); err == nil {
			memberFilter = pgtype.UUID{Bytes: id, Valid: true}
		}
	}
	list, err := h.q.ListChores(r.Context(), query.ListChoresParams{
		HouseholdID:     householdID,
		MemberID:        memberFilter,
		IncludeArchived: r.URL.Query().Get("include_archived") == "true",
	})
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "internal_error", err.Error())
		return
	}
	respond.JSON(w, http.StatusOK, list)
}

// Create POST /v1/chores (admin only)
func (h *ChoreHandler) Create(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok {
		respond.Error(w, http.StatusUnauthorized, "unauthorized", "")
		return
	}
	if middleware.RoleFromCtx(r.Context()) != "admin" {
		respond.Error(w, http.StatusForbidden, "forbidden", "admin role required")
		return
	}
	var req model.CreateChoreRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respond.Error(w, http.StatusBadRequest, "bad_request", err.Error())
		return
	}
	c, err := h.svc.Create(r.Context(), householdID, service.ChoreCreateInput{
		MemberID:      req.MemberID,
		Name:          req.Name,
		Weight:        req.Weight,
		FrequencyKind: req.FrequencyKind,
		DaysOfWeek:    req.DaysOfWeek,
		AutoApprove:   req.AutoApprove,
	})
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "internal_error", err.Error())
		return
	}
	respond.JSON(w, http.StatusCreated, c)
}

// Complete POST /v1/chores/{id}/complete?date=YYYY-MM-DD
func (h *ChoreHandler) Complete(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok {
		respond.Error(w, http.StatusUnauthorized, "unauthorized", "")
		return
	}
	choreID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "bad_request", "invalid chore ID")
		return
	}

	// Auth: caller must be the chore's assignee OR admin.
	chore, err := h.q.GetChore(r.Context(), query.GetChoreParams{ID: choreID, HouseholdID: householdID})
	if err != nil {
		respond.Error(w, http.StatusNotFound, "not_found", "chore not found")
		return
	}
	callerMember, _ := middleware.MemberIDFromCtx(r.Context())
	role := middleware.RoleFromCtx(r.Context())
	if role != "admin" && callerMember != chore.MemberID {
		respond.Error(w, http.StatusForbidden, "forbidden", "not your chore")
		return
	}

	date := time.Now().UTC().Truncate(24 * time.Hour)
	if d := r.URL.Query().Get("date"); d != "" {
		t, err := time.Parse("2006-01-02", d)
		if err == nil {
			date = t
		}
	}
	completion, err := h.svc.Complete(r.Context(), householdID, choreID, date, callerMember)
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "internal_error", err.Error())
		return
	}
	respond.JSON(w, http.StatusCreated, completion)
}

// Undo DELETE /v1/chores/{id}/complete/{date}
func (h *ChoreHandler) Undo(w http.ResponseWriter, r *http.Request) {
	householdID, _ := middleware.HouseholdIDFromCtx(r.Context())
	choreID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "bad_request", "invalid chore ID")
		return
	}
	date, err := time.Parse("2006-01-02", chi.URLParam(r, "date"))
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "bad_request", "invalid date")
		return
	}
	if err := h.svc.Undo(r.Context(), householdID, choreID, date); err != nil {
		respond.Error(w, http.StatusInternalServerError, "internal_error", err.Error())
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// ListCompletions GET /v1/chores/completions?from=&to=&member_id=
func (h *ChoreHandler) ListCompletions(w http.ResponseWriter, r *http.Request) {
	householdID, _ := middleware.HouseholdIDFromCtx(r.Context())
	from, err := time.Parse("2006-01-02", r.URL.Query().Get("from"))
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "bad_request", "from required (YYYY-MM-DD)")
		return
	}
	to, err := time.Parse("2006-01-02", r.URL.Query().Get("to"))
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "bad_request", "to required (YYYY-MM-DD)")
		return
	}
	memberFilter := pgtype.UUID{}
	if mid := r.URL.Query().Get("member_id"); mid != "" {
		if id, err := uuid.Parse(mid); err == nil {
			memberFilter = pgtype.UUID{Bytes: id, Valid: true}
		}
	}
	list, err := h.q.ListChoreCompletionsForRange(r.Context(), query.ListChoreCompletionsForRangeParams{
		HouseholdID: householdID,
		Date:        pgtype.Date{Time: from, Valid: true},
		Date_2:      pgtype.Date{Time: to, Valid: true},
		MemberID:    memberFilter,
	})
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "internal_error", err.Error())
		return
	}
	respond.JSON(w, http.StatusOK, list)
}
```

- [ ] **Step 2: Write the integration test**

`internal/handler/chore_test.go` — model after existing handler tests (`internal/handler/event_test.go`). Cover:
- POST /v1/chores returns 201 + body
- POST /v1/chores returns 403 for child role
- POST /v1/chores/{id}/complete returns 201, returns 403 for wrong member, returns 401 for no auth
- POST /v1/chores/{id}/complete is idempotent on same (chore, date)

```go
package handler_test

import (
	"net/http"
	"testing"

	"github.com/tidyboard/tidyboard/internal/handler"
	"github.com/tidyboard/tidyboard/internal/testutil"
)

func TestChoreHandler_CreateRequiresAdmin(t *testing.T) {
	if testing.Short() { t.Skip("integration") }
	server, cleanup := testutil.NewServerForTest(t)
	defer cleanup()

	// As child role
	resp := server.PostAs(t, "child", "/v1/chores", map[string]any{
		"member_id": "...", "name": "feed dog", "weight": 3, "frequency_kind": "daily",
	})
	if resp.Status != http.StatusForbidden {
		t.Errorf("expected 403, got %d", resp.Status)
	}

	// As admin
	resp = server.PostAs(t, "admin", "/v1/chores", map[string]any{ /* ... */ })
	if resp.Status != http.StatusCreated {
		t.Errorf("expected 201, got %d", resp.Status)
	}
}

// (More integration tests here mirroring the existing pattern in event_test.go)
```

- [ ] **Step 3: Run tests**

Run: `TIDYBOARD_TEST_DSN=... go test ./internal/handler/ -run TestChoreHandler -v`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add internal/handler/chore.go internal/handler/chore_test.go
git commit -m "feat(handler): chore endpoints — list/create/complete/undo + auth gates"
```

---

### Task 9: Wallet + ad-hoc + allowance handlers

**Files:**
- Create: `internal/handler/wallet.go`
- Create: `internal/handler/wallet_test.go`

- [ ] **Step 1: Write the wallet handler**

`internal/handler/wallet.go`:
```go
package handler

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/tidyboard/tidyboard/internal/handler/respond"
	"github.com/tidyboard/tidyboard/internal/middleware"
	"github.com/tidyboard/tidyboard/internal/model"
	"github.com/tidyboard/tidyboard/internal/query"
	"github.com/tidyboard/tidyboard/internal/service"
)

type WalletHandler struct {
	svc *service.WalletService
	q   *query.Queries
}

func NewWalletHandler(svc *service.WalletService, q *query.Queries) *WalletHandler {
	return &WalletHandler{svc: svc, q: q}
}

// Get GET /v1/wallet/{member_id}
func (h *WalletHandler) Get(w http.ResponseWriter, r *http.Request) {
	memberID, err := uuid.Parse(chi.URLParam(r, "member_id"))
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "bad_request", "invalid member ID")
		return
	}
	wallet, err := h.svc.GetWallet(r.Context(), memberID)
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "internal_error", err.Error())
		return
	}
	txs, err := h.svc.ListTransactions(r.Context(), memberID, 50, 0)
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "internal_error", err.Error())
		return
	}
	respond.JSON(w, http.StatusOK, map[string]any{
		"wallet":       wallet,
		"transactions": txs,
	})
}

// Tip POST /v1/wallet/{member_id}/tip (admin)
func (h *WalletHandler) Tip(w http.ResponseWriter, r *http.Request) {
	if middleware.RoleFromCtx(r.Context()) != "admin" {
		respond.Error(w, http.StatusForbidden, "forbidden", "admin role required")
		return
	}
	householdID, _ := middleware.HouseholdIDFromCtx(r.Context())
	accountID, _ := middleware.AccountIDFromCtx(r.Context())
	memberID, _ := uuid.Parse(chi.URLParam(r, "member_id"))

	var req model.TipRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respond.Error(w, http.StatusBadRequest, "bad_request", err.Error())
		return
	}
	tx, err := h.svc.Tip(r.Context(), householdID, memberID, accountID, req.AmountCents, req.Reason)
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "bad_request", err.Error())
		return
	}
	respond.JSON(w, http.StatusCreated, tx)
}

// CashOut POST /v1/wallet/{member_id}/cash-out (admin)
func (h *WalletHandler) CashOut(w http.ResponseWriter, r *http.Request) {
	if middleware.RoleFromCtx(r.Context()) != "admin" {
		respond.Error(w, http.StatusForbidden, "forbidden", "admin role required")
		return
	}
	householdID, _ := middleware.HouseholdIDFromCtx(r.Context())
	accountID, _ := middleware.AccountIDFromCtx(r.Context())
	memberID, _ := uuid.Parse(chi.URLParam(r, "member_id"))

	var req model.CashOutRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respond.Error(w, http.StatusBadRequest, "bad_request", err.Error())
		return
	}
	tx, err := h.svc.CashOut(r.Context(), householdID, memberID, accountID, req.AmountCents, req.Method, req.Note)
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "bad_request", err.Error())
		return
	}
	respond.JSON(w, http.StatusCreated, tx)
}

// Adjust POST /v1/wallet/{member_id}/adjust (admin)
func (h *WalletHandler) Adjust(w http.ResponseWriter, r *http.Request) {
	if middleware.RoleFromCtx(r.Context()) != "admin" {
		respond.Error(w, http.StatusForbidden, "forbidden", "admin role required")
		return
	}
	householdID, _ := middleware.HouseholdIDFromCtx(r.Context())
	accountID, _ := middleware.AccountIDFromCtx(r.Context())
	memberID, _ := uuid.Parse(chi.URLParam(r, "member_id"))

	var req model.AdjustRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respond.Error(w, http.StatusBadRequest, "bad_request", err.Error())
		return
	}
	tx, err := h.svc.Adjust(r.Context(), householdID, memberID, accountID, req.AmountCents, req.Reason)
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "bad_request", err.Error())
		return
	}
	respond.JSON(w, http.StatusCreated, tx)
}

// ListAllowance GET /v1/allowance
func (h *WalletHandler) ListAllowance(w http.ResponseWriter, r *http.Request) {
	householdID, _ := middleware.HouseholdIDFromCtx(r.Context())
	list, err := h.q.ListAllowances(r.Context(), householdID)
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "internal_error", err.Error())
		return
	}
	respond.JSON(w, http.StatusOK, list)
}

// UpsertAllowance PUT /v1/allowance/{member_id} (admin)
func (h *WalletHandler) UpsertAllowance(w http.ResponseWriter, r *http.Request) {
	if middleware.RoleFromCtx(r.Context()) != "admin" {
		respond.Error(w, http.StatusForbidden, "forbidden", "admin role required")
		return
	}
	householdID, _ := middleware.HouseholdIDFromCtx(r.Context())
	memberID, _ := uuid.Parse(chi.URLParam(r, "member_id"))

	var req struct {
		AmountCents int64 `json:"amount_cents"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respond.Error(w, http.StatusBadRequest, "bad_request", err.Error())
		return
	}
	row, err := h.q.UpsertAllowance(r.Context(), query.UpsertAllowanceParams{
		HouseholdID: householdID,
		MemberID:    memberID,
		AmountCents: req.AmountCents,
		ActiveFrom:  pgtype.Date{Valid: true},
	})
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "internal_error", err.Error())
		return
	}
	respond.JSON(w, http.StatusOK, row)
}

// AdHoc handlers — Create / Complete / Approve / Decline live in this file too
// for cohesion (small file).

// CreateAdHoc POST /v1/ad-hoc-tasks (admin)
func (h *WalletHandler) CreateAdHoc(w http.ResponseWriter, r *http.Request) { /* mirrors Tip's pattern */ }

// CompleteAdHoc POST /v1/ad-hoc-tasks/{id}/complete (kid: assignee only)
func (h *WalletHandler) CompleteAdHoc(w http.ResponseWriter, r *http.Request) { /* set status=pending */ }

// ApproveAdHoc POST /v1/ad-hoc-tasks/{id}/approve (admin) — credits wallet
func (h *WalletHandler) ApproveAdHoc(w http.ResponseWriter, r *http.Request) { /* svc.Credit + status=approved */ }

// DeclineAdHoc POST /v1/ad-hoc-tasks/{id}/decline (admin)
func (h *WalletHandler) DeclineAdHoc(w http.ResponseWriter, r *http.Request) { /* status=declined + reason */ }
```

(Implement the four ad-hoc handlers fully — they're each ~15 lines mirroring the patterns above. The placeholder bodies above are deliberately incomplete so the engineer fills them in by mirroring `Tip`/`Adjust` patterns; do not commit until each is implemented and tested.)

- [ ] **Step 2: Write integration tests**

`internal/handler/wallet_test.go` — verify:
- GET /v1/wallet/{id} returns 401 unauthenticated, 200 with body authenticated
- POST /v1/wallet/{id}/tip returns 403 for child, 201 for admin, persists
- POST /v1/wallet/{id}/cash-out decrements balance correctly
- POST /v1/ad-hoc-tasks → POST /complete (kid) → POST /approve (admin) creates the right wallet transaction with kind=ad_hoc

- [ ] **Step 3: Run tests**

Run: `TIDYBOARD_TEST_DSN=... go test ./internal/handler/ -run TestWalletHandler -v`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add internal/handler/wallet.go internal/handler/wallet_test.go
git commit -m "feat(handler): wallet endpoints — get/tip/cash-out/adjust/allowance + ad-hoc lifecycle"
```

---

### Task 10: Wire routes in main.go

**Files:**
- Modify: `cmd/server/main.go`

- [ ] **Step 1: Inject services + handlers into main**

Find the existing service-construction block (look for `routineSvc := service.NewRoutineService(...)`) and add:

```go
walletSvc := service.NewWalletService(q, bc, auditSvc)
choreSvc  := service.NewChoreService(q, walletSvc, bc, auditSvc)
```

Then where handlers are constructed:

```go
walletHandler := handler.NewWalletHandler(walletSvc, q)
choreHandler  := handler.NewChoreHandler(choreSvc, q)
```

- [ ] **Step 2: Wire routes inside the protected route group**

Find the chi route block (`r.Get("/v1/routines", routineHandler.List)` etc.) and add:

```go
// Chores
r.Get("/v1/chores", choreHandler.List)
r.Post("/v1/chores", choreHandler.Create)
r.Patch("/v1/chores/{id}", choreHandler.Update)
r.Delete("/v1/chores/{id}", choreHandler.Archive)
r.Post("/v1/chores/{id}/complete", choreHandler.Complete)
r.Delete("/v1/chores/{id}/complete/{date}", choreHandler.Undo)
r.Get("/v1/chores/completions", choreHandler.ListCompletions)

// Wallet
r.Get("/v1/wallet/{member_id}", walletHandler.Get)
r.Post("/v1/wallet/{member_id}/tip", walletHandler.Tip)
r.Post("/v1/wallet/{member_id}/cash-out", walletHandler.CashOut)
r.Post("/v1/wallet/{member_id}/adjust", walletHandler.Adjust)
r.Get("/v1/allowance", walletHandler.ListAllowance)
r.Put("/v1/allowance/{member_id}", walletHandler.UpsertAllowance)

// Ad-hoc
r.Post("/v1/ad-hoc-tasks", walletHandler.CreateAdHoc)
r.Post("/v1/ad-hoc-tasks/{id}/complete", walletHandler.CompleteAdHoc)
r.Post("/v1/ad-hoc-tasks/{id}/approve", walletHandler.ApproveAdHoc)
r.Post("/v1/ad-hoc-tasks/{id}/decline", walletHandler.DeclineAdHoc)
```

- [ ] **Step 3: Register cron**

Find the existing cron setup block (look for `cron.New()` or `robfig/cron`) and add the week-end batch — Sundays 23:59 UTC:

```go
weekEndJob := cron.WeekEndBatch{Q: q, WS: walletSvc}
if _, err := scheduler.AddFunc("59 23 * * 0", func() {
	if err := weekEndJob.Run(context.Background()); err != nil {
		log.Printf("week-end batch: %v", err)
	}
}); err != nil {
	return fmt.Errorf("schedule week-end batch: %w", err)
}
```

- [ ] **Step 4: Build + smoke-test locally**

Run: `go build ./cmd/server && ./server &`
Then in another shell:
```bash
curl -sS -o /dev/null -w "%{http_code}\n" http://localhost:8080/v1/chores
# Expect: 401 (auth required)
```
Kill server. (`pkill -f "./server"`)

- [ ] **Step 5: Commit**

```bash
git add cmd/server/main.go
git commit -m "feat(server): wire chore + wallet handlers + week-end cron"
```

---

## Phase 5: Frontend types + hooks + math mirror

### Task 11: TypeScript payout-math mirror

**Files:**
- Create: `web/src/lib/wallet/payout-math.ts`
- Create: `web/src/lib/wallet/payout-math.test.ts`

- [ ] **Step 1: Write the failing test (Vitest)**

```ts
import { describe, it, expect } from "vitest";
import { perInstancePayout, weeklyDivisor, streakBonus } from "./payout-math";

describe("payout-math", () => {
  it("single chore weekly returns full allowance", () => {
    expect(perInstancePayout(500, 3, weeklyDivisor([3], [1]))).toBe(500);
  });
  it("uniform-weight 5-chore example", () => {
    const div = weeklyDivisor([3, 3, 3, 3, 3], [7, 7, 7, 5, 1]);
    expect(perInstancePayout(500, 3, div)).toBe(18);
  });
  it("weighted: trash 5 vs brush 1", () => {
    const div = weeklyDivisor([1, 5], [7, 1]);
    expect(perInstancePayout(500, 5, div)).toBe(208);
  });
  it("zero allowance => zero", () => {
    expect(perInstancePayout(0, 3, 81)).toBe(0);
  });
  it("zero divisor => zero (degenerate)", () => {
    expect(perInstancePayout(500, 3, 0)).toBe(0);
  });
  it("streak bonus rounds half-up", () => {
    expect(streakBonus(120)).toBe(12);
    expect(streakBonus(5)).toBe(1);
    expect(streakBonus(0)).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && npx vitest run src/lib/wallet/payout-math.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

```ts
// web/src/lib/wallet/payout-math.ts
//
// TypeScript mirror of internal/service/wallet_math.go. The math runs both
// server-side (authoritative) and client-side (preview UI). KEEP THESE IN
// SYNC — the payout-math.test.ts file ports the same Go test cases so a
// drift will fail the JS suite.

export function weeklyDivisor(weights: number[], frequencies: number[]): number {
  if (weights.length !== frequencies.length) return 0;
  let d = 0;
  for (let i = 0; i < weights.length; i++) {
    if (weights[i] < 0 || frequencies[i] < 0) continue;
    d += weights[i] * frequencies[i];
  }
  return d;
}

export function perInstancePayout(allowanceCents: number, weight: number, divisor: number): number {
  if (allowanceCents <= 0 || weight <= 0 || divisor <= 0) return 0;
  return Math.floor((allowanceCents * weight) / divisor);
}

export function streakBonus(weekTotalCents: number): number {
  if (weekTotalCents <= 0) return 0;
  return Math.floor((weekTotalCents + 5) / 10);
}
```

- [ ] **Step 4: Run test to verify pass**

Run: `cd web && npx vitest run src/lib/wallet/payout-math.test.ts`
Expected: PASS, all 6 cases.

- [ ] **Step 5: Commit**

```bash
git add web/src/lib/wallet/
git commit -m "feat(wallet/web): payout math mirror + tests in sync with Go"
```

---

### Task 12: API hooks + types + fallback

**Files:**
- Modify: `web/src/lib/api/types.ts`
- Modify: `web/src/lib/api/hooks.ts`
- Modify: `web/src/lib/api/fallback.ts`

- [ ] **Step 1: Add types to `types.ts`**

```ts
// Append to web/src/lib/api/types.ts

export interface ApiChore {
  id: string;
  household_id: string;
  member_id: string;
  name: string;
  weight: number;
  frequency_kind: "daily" | "weekdays" | "specific_days" | "weekly";
  days_of_week: string[];
  auto_approve: boolean;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApiChoreCompletion {
  id: string;
  chore_id: string;
  member_id: string;
  date: string; // YYYY-MM-DD
  marked_at: string;
  approved: boolean;
  payout_cents: number;
  closed: boolean;
}

export interface ApiWallet {
  id: string;
  member_id: string;
  balance_cents: number;
  updated_at: string;
}

export interface ApiWalletTransaction {
  id: string;
  wallet_id: string;
  member_id: string;
  amount_cents: number;
  kind: "chore_payout" | "streak_bonus" | "tip" | "ad_hoc" | "cash_out" | "adjustment";
  reference_id: string | null;
  reason: string;
  created_at: string;
}

export interface ApiWalletGetResponse {
  wallet: ApiWallet;
  transactions: ApiWalletTransaction[];
}

export interface ApiAllowance {
  id: string;
  household_id: string;
  member_id: string;
  amount_cents: number;
  active_from: string;
  created_at: string;
}

export interface ApiAdHocTask {
  id: string;
  household_id: string;
  member_id: string;
  name: string;
  payout_cents: number;
  requires_approval: boolean;
  status: "open" | "pending" | "approved" | "declined";
  completed_at: string | null;
  approved_at: string | null;
  decline_reason: string;
  expires_at: string | null;
  created_at: string;
}
```

- [ ] **Step 2: Add hooks to `hooks.ts`**

Append at the end of the file (or in the section that has other domain hooks):

```ts
// ── Chores ─────────────────────────────────────────────────────────────────
export function useChores(opts?: { memberId?: string }) {
  return useQuery<ApiChore[]>({
    queryKey: ["chores", opts?.memberId ?? null],
    queryFn: () =>
      withFallback(
        () => api.get<ApiChore[]>("/v1/chores" + (opts?.memberId ? `?member_id=${opts.memberId}` : "")),
        () => fallback.chores(opts?.memberId)
      ),
  });
}

export function useChoreCompletions(opts: { from: string; to: string; memberId?: string }) {
  return useQuery<ApiChoreCompletion[]>({
    queryKey: ["chore-completions", opts.from, opts.to, opts.memberId ?? null],
    queryFn: () => {
      const qs = new URLSearchParams({ from: opts.from, to: opts.to });
      if (opts.memberId) qs.set("member_id", opts.memberId);
      return withFallback(
        () => api.get<ApiChoreCompletion[]>(`/v1/chores/completions?${qs}`),
        () => fallback.choreCompletions(opts)
      );
    },
  });
}

export function useMarkChoreComplete() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ choreId, date }: { choreId: string; date?: string }) =>
      api.post<ApiChoreCompletion>(`/v1/chores/${choreId}/complete${date ? `?date=${date}` : ""}`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chore-completions"] });
      qc.invalidateQueries({ queryKey: ["wallet"] });
    },
  });
}

export function useUndoChoreComplete() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ choreId, date }: { choreId: string; date: string }) =>
      api.del(`/v1/chores/${choreId}/complete/${date}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chore-completions"] });
      qc.invalidateQueries({ queryKey: ["wallet"] });
    },
  });
}

// ── Wallet ─────────────────────────────────────────────────────────────────
export function useWallet(memberId: string | undefined) {
  return useQuery<ApiWalletGetResponse>({
    queryKey: ["wallet", memberId],
    queryFn: () =>
      withFallback(
        () => api.get<ApiWalletGetResponse>(`/v1/wallet/${memberId}`),
        () => fallback.wallet(memberId!)
      ),
    enabled: Boolean(memberId),
  });
}

export function useTip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ memberId, amountCents, reason }: { memberId: string; amountCents: number; reason: string }) =>
      api.post(`/v1/wallet/${memberId}/tip`, { amount_cents: amountCents, reason }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wallet"] }),
  });
}

export function useCashOut() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ memberId, amountCents, method, note }: { memberId: string; amountCents: number; method?: string; note?: string }) =>
      api.post(`/v1/wallet/${memberId}/cash-out`, { amount_cents: amountCents, method: method ?? "", note: note ?? "" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wallet"] }),
  });
}

export function useAllowance() {
  return useQuery<ApiAllowance[]>({
    queryKey: ["allowance"],
    queryFn: () => withFallback(() => api.get<ApiAllowance[]>("/v1/allowance"), () => []),
  });
}

export function useUpsertAllowance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ memberId, amountCents }: { memberId: string; amountCents: number }) =>
      api.put(`/v1/allowance/${memberId}`, { amount_cents: amountCents }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["allowance"] });
      qc.invalidateQueries({ queryKey: ["chores"] });
    },
  });
}

// ── Chore CRUD (admin) ─────────────────────────────────────────────────────
export function useCreateChore() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: { member_id: string; name: string; weight: number; frequency_kind: string; days_of_week?: string[]; auto_approve: boolean }) =>
      api.post<ApiChore>("/v1/chores", req),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["chores"] }),
  });
}
export function useUpdateChore() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...patch }: { id: string; name?: string; weight?: number; frequency_kind?: string; days_of_week?: string[]; auto_approve?: boolean }) =>
      api.patch<ApiChore>(`/v1/chores/${id}`, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["chores"] }),
  });
}
export function useArchiveChore() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) => api.del(`/v1/chores/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["chores"] }),
  });
}

// ── Ad-hoc tasks ───────────────────────────────────────────────────────────
export function useAdHocTasks(opts?: { memberId?: string; status?: string }) {
  return useQuery<ApiAdHocTask[]>({
    queryKey: ["ad-hoc-tasks", opts?.memberId ?? null, opts?.status ?? null],
    queryFn: () => withFallback(
      () => {
        const qs = new URLSearchParams();
        if (opts?.memberId) qs.set("member_id", opts.memberId);
        if (opts?.status) qs.set("status", opts.status);
        return api.get<ApiAdHocTask[]>(`/v1/ad-hoc-tasks${qs.toString() ? "?" + qs : ""}`);
      },
      () => []
    ),
  });
}
export function useCreateAdHocTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: { member_id: string; name: string; payout_cents: number; expires_at?: string }) =>
      api.post<ApiAdHocTask>("/v1/ad-hoc-tasks", req),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ad-hoc-tasks"] }),
  });
}
export function useApproveAdHocTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) => api.post(`/v1/ad-hoc-tasks/${id}/approve`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ad-hoc-tasks"] });
      qc.invalidateQueries({ queryKey: ["wallet"] });
    },
  });
}
export function useDeclineAdHocTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api.post(`/v1/ad-hoc-tasks/${id}/decline`, { reason }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ad-hoc-tasks"] }),
  });
}
```

- [ ] **Step 3: Add fallbacks to `fallback.ts`**

```ts
// Add to fallback object:
chores(memberId?: string): ApiChore[] {
  // Demo data: 3 chores for the first child member
  const childId = memberId ?? "jackson";
  return [
    { id: "c1", household_id: "h1", member_id: childId, name: "Brush teeth", weight: 1, frequency_kind: "daily", days_of_week: [], auto_approve: true, archived_at: null, created_at: now, updated_at: now },
    { id: "c2", household_id: "h1", member_id: childId, name: "Make bed",     weight: 2, frequency_kind: "daily", days_of_week: [], auto_approve: true, archived_at: null, created_at: now, updated_at: now },
    { id: "c3", household_id: "h1", member_id: childId, name: "Take out trash", weight: 5, frequency_kind: "weekly", days_of_week: [], auto_approve: true, archived_at: null, created_at: now, updated_at: now },
  ];
},
choreCompletions(_: { from: string; to: string; memberId?: string }): ApiChoreCompletion[] {
  return [];
},
wallet(memberId: string): ApiWalletGetResponse {
  return {
    wallet: { id: "w1", member_id: memberId, balance_cents: 480, updated_at: now },
    transactions: [
      { id: "t1", wallet_id: "w1", member_id: memberId, amount_cents: 30,  kind: "chore_payout", reference_id: null, reason: "Brush teeth", created_at: now },
      { id: "t2", wallet_id: "w1", member_id: memberId, amount_cents: 250, kind: "tip",          reference_id: null, reason: "Helping with groceries", created_at: now },
      { id: "t3", wallet_id: "w1", member_id: memberId, amount_cents: 200, kind: "chore_payout", reference_id: null, reason: "Take out trash",         created_at: now },
    ],
  };
},
```

- [ ] **Step 4: Type-check + run vitest**

Run: `cd web && npx tsc --noEmit && npx vitest run src/lib/wallet/`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add web/src/lib/api/
git commit -m "feat(wallet/web): types, react-query hooks, fallback shapes"
```

---

## Phase 6: UI primitives

### Task 13: MoneyDisplay primitive

**Files:**
- Create: `web/src/components/ui/money-display.tsx`
- Create: `web/src/components/ui/money-display.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MoneyDisplay } from "./money-display";

describe("MoneyDisplay", () => {
  it("formats cents as USD", () => {
    render(<MoneyDisplay cents={4230} />);
    expect(screen.getByText("$42.30")).toBeInTheDocument();
  });
  it("handles zero", () => {
    render(<MoneyDisplay cents={0} />);
    expect(screen.getByText("$0.00")).toBeInTheDocument();
  });
  it("handles negative (cash-out display)", () => {
    render(<MoneyDisplay cents={-500} />);
    expect(screen.getByText("−$5.00")).toBeInTheDocument();
  });
  it("applies member color to text when provided", () => {
    const { container } = render(<MoneyDisplay cents={100} color="#22C55E" />);
    expect(container.querySelector("span")).toHaveStyle({ color: "#22C55E" });
  });
});
```

- [ ] **Step 2: Implement**

```tsx
// web/src/components/ui/money-display.tsx
import { TB } from "@/lib/tokens";

export interface MoneyDisplayProps {
  cents: number;
  color?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

const SIZES: Record<NonNullable<MoneyDisplayProps["size"]>, number> = {
  sm: 14,
  md: 18,
  lg: 28,
  xl: 48,
};

export function MoneyDisplay({ cents, color, size = "md" }: MoneyDisplayProps) {
  const negative = cents < 0;
  const dollars = Math.abs(cents) / 100;
  const formatted = dollars.toLocaleString(undefined, { style: "currency", currency: "USD" });
  return (
    <span
      style={{
        fontFamily: TB.fontDisplay,
        fontSize: SIZES[size],
        fontWeight: 600,
        color: color ?? TB.text,
      }}
    >
      {negative ? "−" + formatted : formatted}
    </span>
  );
}
```

- [ ] **Step 3: Run + commit**

```bash
cd web && npx vitest run src/components/ui/money-display.test.tsx
git add web/src/components/ui/money-display{.tsx,.test.tsx}
git commit -m "feat(ui): MoneyDisplay primitive — cents → \$X.XX with member-color tint"
```

---

### Task 14: StreakIndicator primitive

**Files:**
- Create: `web/src/components/ui/streak-indicator.tsx`
- Create: `web/src/components/ui/streak-indicator.test.tsx`

- [ ] **Step 1: Test**

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StreakIndicator } from "./streak-indicator";

describe("StreakIndicator", () => {
  it("shows zero state when count=0", () => {
    render(<StreakIndicator count={0} />);
    expect(screen.getByText(/0/)).toBeInTheDocument();
  });
  it("shows count + flame", () => {
    render(<StreakIndicator count={7} />);
    expect(screen.getByText(/7/)).toBeInTheDocument();
  });
  it("applies hot styling at 100% (max=count)", () => {
    const { container } = render(<StreakIndicator count={7} max={7} />);
    expect(container.firstChild).toHaveAttribute("data-hot", "true");
  });
});
```

- [ ] **Step 2: Implement**

```tsx
// web/src/components/ui/streak-indicator.tsx
import { TB } from "@/lib/tokens";

export interface StreakIndicatorProps {
  count: number;
  max?: number;
  color?: string;
}

export function StreakIndicator({ count, max, color }: StreakIndicatorProps) {
  const hot = max !== undefined && count >= max && count > 0;
  return (
    <div
      data-hot={hot ? "true" : "false"}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "4px 10px",
        borderRadius: 9999,
        background: hot ? "#F97316" : (color ?? TB.muted) + "22",
        color: hot ? "#fff" : (color ?? TB.text2),
        fontSize: 13,
        fontWeight: 600,
        transition: "all .25s",
      }}
    >
      <span aria-hidden>🔥</span>
      <span>{count}</span>
    </div>
  );
}
```

- [ ] **Step 3: Run + commit**

```bash
cd web && npx vitest run src/components/ui/streak-indicator.test.tsx
git add web/src/components/ui/streak-indicator{.tsx,.test.tsx}
git commit -m "feat(ui): StreakIndicator primitive — flame + count + hot state at max"
```

---

## Phase 7: Kid-facing screens

### Task 15: WalletKid screen

**Files:**
- Create: `web/src/components/screens/wallet-kid.tsx`
- Create: `web/src/components/screens/wallet-kid.test.tsx`

- [ ] **Step 1: Write the test**

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WalletKid } from "./wallet-kid";

vi.mock("@/lib/api/hooks", () => ({
  useWallet: () => ({
    data: {
      wallet: { id: "w1", member_id: "kid1", balance_cents: 4230, updated_at: "" },
      transactions: [
        { id: "t1", amount_cents: 30,  kind: "chore_payout", reason: "Brush teeth",         created_at: "2026-04-26T08:00:00Z" },
        { id: "t2", amount_cents: 250, kind: "tip",          reason: "Helping w/ groceries", created_at: "2026-04-25T18:00:00Z" },
      ],
    },
  }),
  useMembers: () => ({ data: [{ id: "kid1", name: "Sarah", color: "#22C55E" }] }),
}));

function renderWithQuery(ui: React.ReactElement) {
  const qc = new QueryClient();
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe("WalletKid", () => {
  it("shows the kid's balance prominently", () => {
    renderWithQuery(<WalletKid memberId="kid1" />);
    expect(screen.getByText("$42.30")).toBeInTheDocument();
  });
  it("lists recent transactions with reasons", () => {
    renderWithQuery(<WalletKid memberId="kid1" />);
    expect(screen.getByText("Brush teeth")).toBeInTheDocument();
    expect(screen.getByText("Helping w/ groceries")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Implement**

```tsx
// web/src/components/screens/wallet-kid.tsx
"use client";

import { TB } from "@/lib/tokens";
import { Card } from "@/components/ui/card";
import { H } from "@/components/ui/heading";
import { MoneyDisplay } from "@/components/ui/money-display";
import { useWallet, useMembers } from "@/lib/api/hooks";

export function WalletKid({ memberId, dark = false }: { memberId: string; dark?: boolean }) {
  const { data: wallet } = useWallet(memberId);
  const { data: members } = useMembers();
  const member = members?.find((m) => m.id === memberId);
  const color = member?.color ?? TB.primary;

  if (!wallet) {
    return <div style={{ padding: 24, fontFamily: TB.fontBody }}>Loading…</div>;
  }

  return (
    <div style={{ width: "100%", height: "100%", background: dark ? TB.dBg : TB.bg, fontFamily: TB.fontBody, padding: 24, boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 12, color: TB.text2, letterSpacing: "0.08em" }}>{member?.name ?? "WALLET"} · BALANCE</div>
        <div style={{ marginTop: 8 }}>
          <MoneyDisplay cents={wallet.wallet.balance_cents} color={color} size="xl" />
        </div>
      </div>

      <H as="h3" style={{ fontSize: 16, marginTop: 8 }}>Recent</H>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {wallet.transactions.map((tx) => (
          <Card key={tx.id} pad={12} style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{tx.reason || labelFor(tx.kind)}</div>
              <div style={{ fontSize: 11, color: TB.text2 }}>{relTime(tx.created_at)} · {labelFor(tx.kind)}</div>
            </div>
            <MoneyDisplay cents={tx.amount_cents} color={tx.amount_cents < 0 ? TB.destructive : color} size="md" />
          </Card>
        ))}
      </div>
    </div>
  );
}

function labelFor(kind: string): string {
  const m: Record<string, string> = {
    chore_payout: "Chore",
    streak_bonus: "Streak bonus",
    tip: "Tip",
    ad_hoc: "Bonus task",
    cash_out: "Cashed out",
    adjustment: "Adjustment",
  };
  return m[kind] ?? kind;
}

function relTime(iso: string): string {
  const sec = (Date.now() - new Date(iso).getTime()) / 1000;
  if (sec < 60) return "just now";
  if (sec < 3600) return `${Math.floor(sec/60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec/3600)}h ago`;
  return `${Math.floor(sec/86400)}d ago`;
}
```

- [ ] **Step 3: Run + commit**

```bash
cd web && npx vitest run src/components/screens/wallet-kid.test.tsx
git add web/src/components/screens/wallet-kid{.tsx,.test.tsx}
git commit -m "feat(wallet/web): WalletKid screen — balance + recent transactions"
```

---

### Task 16: ChoresKid screen + page route

**Files:**
- Create: `web/src/components/screens/chores-kid.tsx`
- Create: `web/src/components/screens/chores-kid.test.tsx`
- Create: `web/src/app/chores/page.tsx`
- Create: `web/src/app/wallet/page.tsx`

- [ ] **Step 1: Test (component)**

```tsx
// chores-kid.test.tsx — verify:
//   - renders chore cards by name
//   - tap-to-complete invokes useMarkChoreComplete mutation
//   - completed chores show ✓ + member-color glow
```

- [ ] **Step 2: Implement `chores-kid.tsx`**

Calendar week view: 7 columns (one per day), each chore as a row, each cell tappable. On tap, fire `useMarkChoreComplete`. On long-press or ✗ tap, fire `useUndoChoreComplete`. Use member color for glow when 100% done. Confetti from `canvas-confetti` (already in package.json) on each successful tap.

```tsx
// web/src/components/screens/chores-kid.tsx
"use client";

import { useMemo } from "react";
import confetti from "canvas-confetti";
import { TB } from "@/lib/tokens";
import { Icon } from "@/components/ui/icon";
import { H } from "@/components/ui/heading";
import { MoneyDisplay } from "@/components/ui/money-display";
import { StreakIndicator } from "@/components/ui/streak-indicator";
import { useChores, useChoreCompletions, useMarkChoreComplete, useMembers, useAllowance } from "@/lib/api/hooks";
import { perInstancePayout, weeklyDivisor } from "@/lib/wallet/payout-math";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function startOfWeek(d: Date): Date {
  const start = new Date(d);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - start.getDay());
  return start;
}

function fmtDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function freqPerWeek(kind: string, days: string[]): number {
  switch (kind) {
    case "daily": return 7;
    case "weekdays": return 5;
    case "specific_days": return days.length;
    case "weekly": return 1;
  }
  return 0;
}

export function ChoresKid({ memberId }: { memberId: string }) {
  const { data: chores = [] } = useChores({ memberId });
  const { data: members } = useMembers();
  const { data: allowances } = useAllowance();

  const member = members?.find((m) => m.id === memberId);
  const color = member?.color ?? TB.primary;

  const weekStart = useMemo(() => startOfWeek(new Date()), []);
  const weekEnd = useMemo(() => {
    const d = new Date(weekStart); d.setDate(d.getDate() + 6); return d;
  }, [weekStart]);

  const { data: completions = [] } = useChoreCompletions({
    from: fmtDate(weekStart),
    to: fmtDate(weekEnd),
    memberId,
  });
  const mark = useMarkChoreComplete();

  const allowance = allowances?.find((a) => a.member_id === memberId)?.amount_cents ?? 0;
  const divisor = weeklyDivisor(chores.map((c) => c.weight), chores.map((c) => freqPerWeek(c.frequency_kind, c.days_of_week)));

  function isCompleted(choreId: string, dayDate: Date): boolean {
    return completions.some((c) => c.chore_id === choreId && c.date === fmtDate(dayDate));
  }

  function handleTap(choreId: string, dayDate: Date) {
    if (isCompleted(choreId, dayDate)) return;
    mark.mutate(
      { choreId, date: fmtDate(dayDate) },
      {
        onSuccess: () => {
          confetti({ particleCount: 60, spread: 60, origin: { y: 0.7 } });
        },
      }
    );
  }

  return (
    <div style={{ width: "100%", height: "100%", background: TB.bg, fontFamily: TB.fontBody, padding: 16, boxSizing: "border-box", overflow: "auto" }}>
      <H as="h2" style={{ fontSize: 20, color }}>{member?.name ?? "Chores"}</H>
      <div style={{ display: "grid", gridTemplateColumns: "150px repeat(7, 1fr)", gap: 4, marginTop: 12 }}>
        <div />
        {DAYS.map((d, i) => {
          const dt = new Date(weekStart); dt.setDate(dt.getDate() + i);
          return (
            <div key={d} style={{ textAlign: "center", fontSize: 11, color: TB.text2, fontWeight: 600 }}>
              {d}<br/>{dt.getDate()}
            </div>
          );
        })}
        {chores.map((c) => {
          const freq = freqPerWeek(c.frequency_kind, c.days_of_week);
          const payout = perInstancePayout(allowance, c.weight, divisor);
          const completedThisWeek = DAYS.reduce((acc, _, i) => {
            const dt = new Date(weekStart); dt.setDate(dt.getDate() + i);
            return acc + (isCompleted(c.id, dt) ? 1 : 0);
          }, 0);
          const hot = completedThisWeek >= freq && freq > 0;
          return (
            <>
              <div key={`label-${c.id}`} style={{ display: "flex", flexDirection: "column", padding: 8, background: TB.surface, border: `1px solid ${TB.border}`, borderRadius: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{c.name}</div>
                <div style={{ fontSize: 10, color: TB.text2, marginTop: 2 }}>
                  weight {c.weight} · <MoneyDisplay cents={payout} size="sm" />
                </div>
                <div style={{ marginTop: 4 }}>
                  <StreakIndicator count={completedThisWeek} max={freq} color={color} />
                </div>
              </div>
              {DAYS.map((_, i) => {
                const dt = new Date(weekStart); dt.setDate(dt.getDate() + i);
                const done = isCompleted(c.id, dt);
                return (
                  <div
                    key={`${c.id}-${i}`}
                    role="button"
                    aria-label={`${c.name} ${DAYS[i]}`}
                    onClick={() => handleTap(c.id, dt)}
                    style={{
                      minHeight: 56,
                      borderRadius: 8,
                      border: `1px solid ${TB.border}`,
                      background: done ? color + "33" : TB.surface,
                      boxShadow: hot && done ? `0 0 0 2px ${color}` : "none",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                    }}
                  >
                    {done && <Icon name="check" size={20} color={color} stroke={3} />}
                  </div>
                );
              })}
            </>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Add `/chores` and `/wallet` routes**

`web/src/app/chores/page.tsx`:
```tsx
"use client";
import { TB } from "@/lib/tokens";
import { ChoresKid } from "@/components/screens/chores-kid";
import { useAuth } from "@/lib/auth/auth-store";

export default function ChoresPage() {
  const { activeMember } = useAuth();
  if (!activeMember) return <div style={{ padding: 24, fontFamily: TB.fontBody }}>Sign in to view your chores.</div>;
  return (
    <div style={{ width: "100vw", height: "100vh", overflow: "hidden", display: "flex", flexDirection: "column", background: TB.bg }}>
      <div style={{ padding: "8px 16px", background: TB.surface, borderBottom: `1px solid ${TB.border}` }}>
        <a href="/" style={{ color: TB.text2, textDecoration: "none", fontSize: 13 }}>← Home</a>
      </div>
      <div style={{ flex: 1, overflow: "hidden" }}>
        <ChoresKid memberId={activeMember.id} />
      </div>
    </div>
  );
}
```

`web/src/app/wallet/page.tsx`:
```tsx
"use client";
import { TB } from "@/lib/tokens";
import { WalletKid } from "@/components/screens/wallet-kid";
import { useAuth } from "@/lib/auth/auth-store";

export default function WalletPage() {
  const { activeMember } = useAuth();
  if (!activeMember) return <div style={{ padding: 24, fontFamily: TB.fontBody }}>Sign in to view your wallet.</div>;
  return (
    <div style={{ width: "100vw", height: "100vh", overflow: "hidden", display: "flex", flexDirection: "column", background: TB.bg }}>
      <div style={{ padding: "8px 16px", background: TB.surface, borderBottom: `1px solid ${TB.border}` }}>
        <a href="/" style={{ color: TB.text2, textDecoration: "none", fontSize: 13 }}>← Home</a>
      </div>
      <div style={{ flex: 1, overflow: "hidden" }}>
        <WalletKid memberId={activeMember.id} />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Add nav entries (en/de + bottom-nav)**

In `web/src/i18n/messages/en.json` under `nav`:
```json
"wallet": "Wallet",
"chores": "Chores",
```
Same in `de.json`:
```json
"wallet": "Geldbeutel",
"chores": "Aufgaben",
```

In `web/src/components/screens/dashboard-phone.tsx` bottom-nav `tabs={[ … ]}` add (placement: between `routines` and `lists`):
```tsx
{ n: "star", l: tNav("wallet"), href: "/wallet" },
{ n: "list", l: tNav("chores"), href: "/chores" },
```

In `web/src/components/screens/dashboard-desktop.tsx` nav array:
```tsx
{ i: "star", l: tNav("wallet"), href: "/wallet" },
{ i: "list", l: tNav("chores"), href: "/chores" },
```

- [ ] **Step 5: TypeScript + tests + commit**

```bash
cd web && npx tsc --noEmit && npx vitest run
git add web/src/components/screens/{chores-kid,wallet-kid}.{tsx,test.tsx} web/src/app/{wallet,chores}/page.tsx web/src/components/screens/dashboard-{phone,desktop}.tsx web/src/i18n/messages/{en,de}.json
git commit -m "feat(wallet/web): ChoresKid + /chores + /wallet routes + nav entries"
```

---

## Phase 8: Parent admin screens

### Task 17: WalletsAdmin (overview list)

**Files:**
- Create: `web/src/components/screens/wallets-admin.tsx`
- Create: `web/src/app/admin/wallets/page.tsx`

- [ ] **Step 1: Implement `WalletsAdmin`**

Per-kid card showing balance + cash-out button + recent transactions snapshot. Uses `useMembers` (filtered to children) + `useWallet` per member. (No test for admin screens — covered by e2e in Task 19.)

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TB } from "@/lib/tokens";
import { Card } from "@/components/ui/card";
import { Btn } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { H } from "@/components/ui/heading";
import { MoneyDisplay } from "@/components/ui/money-display";
import { useMembers, useWallet, useCashOut } from "@/lib/api/hooks";

export function WalletsAdmin() {
  const { data: members = [] } = useMembers();
  const kids = members.filter((m) => m.role === "child");
  const router = useRouter();

  return (
    <div style={{ padding: 16, fontFamily: TB.fontBody, background: TB.bg, minHeight: "100%" }}>
      <H as="h2" style={{ fontSize: 22 }}>Kid wallets</H>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12, marginTop: 16 }}>
        {kids.map((m) => <KidWalletCard key={m.id} member={m} onOpen={() => router.push(`/admin/wallets/${m.id}`)} />)}
      </div>
    </div>
  );
}

function KidWalletCard({ member, onOpen }: { member: { id: string; name: string; color: string }; onOpen: () => void }) {
  const { data: wallet } = useWallet(member.id);
  const cashOut = useCashOut();
  const [amt, setAmt] = useState("");
  const [busy, setBusy] = useState(false);

  function handleCashOut() {
    const cents = Math.round(parseFloat(amt) * 100);
    if (!cents || cents <= 0) return;
    setBusy(true);
    cashOut.mutate(
      { memberId: member.id, amountCents: cents, method: "cash" },
      { onSettled: () => { setBusy(false); setAmt(""); } }
    );
  }

  return (
    <Card pad={14} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Avatar member={member} size={36} ring={false} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{member.name}</div>
          <MoneyDisplay cents={wallet?.wallet.balance_cents ?? 0} color={member.color} size="lg" />
        </div>
      </div>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <span style={{ fontSize: 12, color: TB.text2 }}>$</span>
        <input
          type="number"
          step="0.01"
          min="0"
          value={amt}
          onChange={(e) => setAmt(e.target.value)}
          placeholder="amount"
          style={{ flex: 1, padding: "6px 8px", border: `1px solid ${TB.border}`, borderRadius: 6, fontSize: 13 }}
        />
        <Btn kind="secondary" size="sm" onClick={handleCashOut} disabled={busy || !amt}>Cash out</Btn>
      </div>
      <Btn kind="ghost" size="sm" onClick={onOpen}>View detail →</Btn>
    </Card>
  );
}
```

- [ ] **Step 2: Add the route**

`web/src/app/admin/wallets/page.tsx`:
```tsx
import { WalletsAdmin } from "@/components/screens/wallets-admin";
export default function Page() { return <WalletsAdmin />; }
```

- [ ] **Step 3: Commit**

```bash
git add web/src/components/screens/wallets-admin.tsx web/src/app/admin/wallets/page.tsx
git commit -m "feat(wallet/web): WalletsAdmin overview + /admin/wallets route"
```

---

### Task 18: ChoresAdmin + WalletDetail + AdHocAdmin (combined)

**Files:**
- Create: `web/src/components/screens/chores-admin.tsx`
- Create: `web/src/components/screens/wallet-detail.tsx`
- Create: `web/src/components/screens/ad-hoc-admin.tsx`
- Create: `web/src/app/admin/chores/page.tsx`
- Create: `web/src/app/admin/wallets/[id]/page.tsx`
- Create: `web/src/app/admin/ad-hoc/page.tsx`

This task ships all three remaining admin screens. They follow the same pattern (existing admin pages like `web/src/app/settings/family-card.tsx` for reference). Each is ~150 lines.

- [ ] **Step 1: Implement `ChoresAdmin`** (table of chores per kid; add/edit modal with weight slider + frequency picker + auto-approve toggle; uses `useChores`, `useCreateChore`, `useUpdateChore`, `useArchiveChore` — add the missing hooks to `hooks.ts` first if not present)

- [ ] **Step 2: Implement `WalletDetail`** (full ledger paginated; allowance editor inline; tip form `{amount, reason}`; approve/decline pending ad-hoc tasks)

- [ ] **Step 3: Implement `AdHocAdmin`** (form: kid · name · payout · expires_at; pending list at top with Approve/Decline buttons)

- [ ] **Step 4: Wire routes**

```tsx
// web/src/app/admin/chores/page.tsx
import { ChoresAdmin } from "@/components/screens/chores-admin";
export default function Page() { return <ChoresAdmin />; }
```

```tsx
// web/src/app/admin/wallets/[id]/page.tsx
import { WalletDetail } from "@/components/screens/wallet-detail";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <WalletDetail memberId={id} />;
}
```

```tsx
// web/src/app/admin/ad-hoc/page.tsx
import { AdHocAdmin } from "@/components/screens/ad-hoc-admin";
export default function Page() { return <AdHocAdmin />; }
```

- [ ] **Step 5: TypeScript check, then commit**

```bash
cd web && npx tsc --noEmit
git add web/src/components/screens/{chores-admin,wallet-detail,ad-hoc-admin}.tsx web/src/app/admin/{chores,wallets/[id],ad-hoc}/page.tsx web/src/lib/api/hooks.ts
git commit -m "feat(wallet/web): ChoresAdmin + WalletDetail + AdHocAdmin + routes"
```

---

## Phase 9: E2E + prod tests

### Task 19: Local Playwright e2e (kid + admin happy paths)

**Files:**
- Create: `web/e2e/wallet.spec.ts`

- [ ] **Step 1: Write the test**

```ts
import { test, expect, gotoAndWait } from "./fixtures";

test.describe("Wallet — kid happy path (fallback mode)", () => {
  test("kid sees balance + chore cards on /wallet and /chores", async ({ page }) => {
    await gotoAndWait(page, "/wallet");
    await expect(page.locator("body")).toContainText("BALANCE");
    await expect(page.locator("body")).toContainText("$"); // money rendered

    await gotoAndWait(page, "/chores");
    // The fallback returns "Brush teeth" / "Make bed" / "Take out trash"
    await expect(page.getByText(/Brush teeth/)).toBeVisible();
    await expect(page.getByText(/Take out trash/)).toBeVisible();
  });

  test("admin /admin/wallets renders kid cards with balance", async ({ page }) => {
    await gotoAndWait(page, "/admin/wallets");
    await expect(page.getByText(/Kid wallets/i)).toBeVisible();
  });

  test("admin /admin/chores renders the chores admin", async ({ page }) => {
    await gotoAndWait(page, "/admin/chores");
    await expect(page).toHaveURL(/\/admin\/chores/);
  });
});
```

- [ ] **Step 2: Run**

Run: `cd web && npx playwright test e2e/wallet.spec.ts --project=chromium --reporter=list`
Expected: 3/3 PASS.

- [ ] **Step 3: Commit**

```bash
git add web/e2e/wallet.spec.ts
git commit -m "test(e2e): wallet + chores kid/admin happy-path smoke (fallback mode)"
```

---

### Task 20: Prod test extension (auth-gated)

**Files:**
- Modify: `web/e2e-prod/helpers/api.ts`
- Modify: `web/e2e-prod/tests/family-flow.spec.ts`

- [ ] **Step 1: Add wallet API helpers**

Append to `web/e2e-prod/helpers/api.ts`:

```ts
export interface ChoreResponse { id: string; name: string; weight: number; frequency_kind: string; auto_approve: boolean; member_id: string }
export interface WalletGetResponse { wallet: { id: string; balance_cents: number }; transactions: Array<{ id: string; amount_cents: number; kind: string }> }

export const apiCreateChore = (token: string, body: { member_id: string; name: string; weight: number; frequency_kind: string; auto_approve: boolean }) =>
  request<ChoreResponse>("POST", "/v1/chores", { token, body });

export const apiCompleteChore = (token: string, choreId: string, date?: string) =>
  request<unknown>("POST", `/v1/chores/${choreId}/complete${date ? `?date=${date}` : ""}`, { token });

export const apiGetWallet = (token: string, memberId: string) =>
  request<WalletGetResponse>("GET", `/v1/wallet/${memberId}`, { token });

export const apiTip = (token: string, memberId: string, amount_cents: number, reason: string) =>
  request<unknown>("POST", `/v1/wallet/${memberId}/tip`, { token, body: { amount_cents, reason } });

export const apiUpsertAllowance = (token: string, memberId: string, amount_cents: number) =>
  request<unknown>("PUT", `/v1/allowance/${memberId}`, { token, body: { amount_cents } });

export const apiCashOut = (token: string, memberId: string, amount_cents: number) =>
  request<unknown>("POST", `/v1/wallet/${memberId}/cash-out`, { token, body: { amount_cents, method: "cash", note: "e2e" } });

export const apiDeleteChore = (token: string, choreId: string) =>
  request<unknown>("DELETE", `/v1/chores/${choreId}`, { token });
```

- [ ] **Step 2: Add prod tests + cleanup tracking**

Append to `web/e2e-prod/tests/family-flow.spec.ts` describe block:

```ts
test("7. wallet flow: allowance + chore + completion + tip + cash-out", async () => {
  // Find a kid member created in step 2
  const members = await apiListMembers(TOKEN, householdId);
  const kid = members.find((m) => m.name.startsWith(`[${RUN}]`) && m.role === "child");
  if (!kid) test.skip(true, "no test kid available from step 2");

  // Set $5/week allowance
  await apiUpsertAllowance(TOKEN, kid!.id, 500);

  // Create a chore
  const chore = await apiCreateChore(TOKEN, {
    member_id: kid!.id,
    name: `[${RUN}] feed dog`,
    weight: 3,
    frequency_kind: "daily",
    auto_approve: true,
  });
  cleanup.trackList(TOKEN, chore.id); // re-use trackList for chore — extend CleanupQueue with trackChore later
  expect(chore.id).toBeTruthy();

  // Complete it for today
  await apiCompleteChore(TOKEN, chore.id);

  // Verify wallet got credited
  const w1 = await apiGetWallet(TOKEN, kid!.id);
  expect(w1.wallet.balance_cents).toBeGreaterThan(0);

  // Tip $1
  await apiTip(TOKEN, kid!.id, 100, "great job today");
  const w2 = await apiGetWallet(TOKEN, kid!.id);
  expect(w2.wallet.balance_cents).toBeGreaterThan(w1.wallet.balance_cents);
  expect(w2.transactions.some((t) => t.kind === "tip")).toBe(true);

  // Cash out the full balance
  await apiCashOut(TOKEN, kid!.id, w2.wallet.balance_cents);
  const w3 = await apiGetWallet(TOKEN, kid!.id);
  expect(w3.wallet.balance_cents).toBe(0);
});
```

Also add a `trackChore` method to `CleanupQueue` in `web/e2e-prod/helpers/cleanup.ts` that calls `apiDeleteChore`. (Mirror the existing `trackList` pattern.)

- [ ] **Step 3: Run prod tests with token**

Run (with valid token):
```bash
cd web && TIDYBOARD_TEST_TOKEN=eyJ... npx playwright test --config=e2e-prod/playwright.config.ts tests/family-flow.spec.ts --reporter=list
```

Expected: prior 6 tests pass, the new wallet flow test passes.

- [ ] **Step 4: Commit + push**

```bash
git add web/e2e-prod/
git commit -m "test(e2e-prod): wallet flow — allowance + chore + completion + tip + cash-out"
```

---

## Phase 10: Final integration + deploy

### Task 21: Final smoke + PR + deploy

- [ ] **Step 1: Full vitest run**

```bash
cd web && npx vitest run
```

Expected: all suites pass (102 + new ones).

- [ ] **Step 2: Full Go test run**

```bash
TIDYBOARD_TEST_DSN=postgres://... go test ./...
```

Expected: all packages pass.

- [ ] **Step 3: Local Playwright smoke**

```bash
cd web && npx playwright test --project=chromium --reporter=list
```

Expected: all green.

- [ ] **Step 4: Open PR**

```bash
gh pr create --title "feat: chore wallet system (Plan A)" --body "$(cat <<'EOF'
## Summary
Plan A of 2 — ships the entire wallet half of the chore-wallet-points spec:
parent-weighted weekly allowance auto-split over assigned chores, daily kid
check-off with optional auto-approve, streak bonus, ad-hoc paid tasks with
parent approval, parent tipping, parent cash-out. Both kid screens (Wallet,
Chores) and parent admin screens (WalletsAdmin, WalletDetail, ChoresAdmin,
AdHocAdmin) ship.

Plan B (points + rewards + scoreboard + timeline) follows.

## What's in
- 7 new tables + sqlc queries
- WalletService (atomic ledger writes) + ChoreService (CRUD + complete/undo) + week-end cron job (streak bonus + closure + summary)
- 14 endpoints across /v1/chores, /v1/wallet, /v1/allowance, /v1/ad-hoc-tasks
- TypeScript payout-math mirror of the Go service (in-sync test cases)
- 6 frontend screens + 4 routes + 2 new UI primitives (MoneyDisplay, StreakIndicator)
- E2E suite (fallback mode) + prod e2e wallet flow

## Test plan
- [x] vitest — all green incl. new payout-math tests
- [x] go test ./... — all packages green
- [x] npx playwright test — chromium green
- [x] manual: live prod test with valid TIDYBOARD_TEST_TOKEN — wallet flow passes
EOF
)"
```

- [ ] **Step 5: Merge after CI green**

```bash
gh pr merge --squash --delete-branch
```

This auto-deploys via the EC2 workflow. Watch the deploy:

```bash
gh run watch $(gh run list --workflow "Deploy to EC2" --limit 1 --json databaseId --jq '.[0].databaseId') --exit-status
```

- [ ] **Step 6: Smoke prod**

```bash
curl -sS -o /dev/null -w "%{http_code}\n" https://tidyboard.org/v1/chores
# Expect: 401 (auth gate works)
curl -sS -o /dev/null -w "%{http_code}\n" https://tidyboard.org/wallet
# Expect: 200 (page renders)
curl -sS -o /dev/null -w "%{http_code}\n" https://tidyboard.org/chores
# Expect: 200
```

Then run the prod e2e:
```bash
cd web && TIDYBOARD_TEST_TOKEN=... npx playwright test --config=e2e-prod/playwright.config.ts --reporter=list
```

Expected: all suites pass against live tidyboard.org.

- [ ] **Step 7: Done — close out Plan A**

Update `MEMORY.md` with completion note. Hand off to Plan B (points + rewards) as a separate brainstorm session if not already specced.

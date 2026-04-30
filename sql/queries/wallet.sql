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
  SELECT COALESCE(SUM(wt.amount_cents), 0)::BIGINT AS s
  FROM wallet_transactions wt
  WHERE wt.member_id = $1
)
UPDATE wallets SET balance_cents = (SELECT s FROM ledger), updated_at = NOW()
WHERE wallets.member_id = $1
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
SELECT COALESCE(SUM(wt.amount_cents), 0)::BIGINT AS total
FROM wallet_transactions wt
WHERE wt.member_id = $1
  AND wt.kind = 'chore_payout'
  AND wt.reference_id IN (
    SELECT cc.id FROM chore_completions cc
    WHERE cc.chore_id = $2 AND cc.date BETWEEN $3 AND $4
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

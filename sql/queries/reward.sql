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

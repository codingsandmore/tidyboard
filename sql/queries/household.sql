-- sql/queries/household.sql
-- Household queries. Run `sqlc generate` to produce Go code in internal/query/.

-- name: CreateHousehold :one
INSERT INTO households (
    id,
    name,
    timezone,
    settings,
    created_by,
    invite_code,
    created_at,
    updated_at
) VALUES (
    $1, $2, $3, $4, $5, $6, NOW(), NOW()
)
RETURNING *;

-- name: GetHousehold :one
SELECT * FROM households
WHERE id = $1
LIMIT 1;

-- name: ListHouseholdsByAccount :many
SELECT h.* FROM households h
INNER JOIN members m ON m.household_id = h.id
WHERE m.account_id = $1
ORDER BY h.created_at DESC;

-- name: UpdateHousehold :one
UPDATE households
SET
    name        = COALESCE(sqlc.narg(name), name),
    timezone    = COALESCE(sqlc.narg(timezone), timezone),
    settings    = COALESCE(sqlc.narg(settings), settings),
    updated_at  = NOW()
WHERE id = $1
RETURNING *;

-- name: DeleteHousehold :exec
DELETE FROM households
WHERE id = $1;

-- name: RegenerateInviteCode :one
UPDATE households
SET invite_code = $2, updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: GetHouseholdByInviteCode :one
SELECT * FROM households
WHERE invite_code = $1
LIMIT 1;

-- name: GetHouseholdPayoutCentsPerWeight :one
-- Returns the household's flat per-weight chore payout rate (cents).
-- Used as the fallback when a member has no allowance configured but a chore
-- is auto-approved. Defaults to 500 (5 stones / weight) per migration
-- 20260501000050_chore_wallet_idempotency.sql.
SELECT payout_cents_per_weight FROM households
WHERE id = $1
LIMIT 1;

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

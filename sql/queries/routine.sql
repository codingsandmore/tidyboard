-- sql/queries/routine.sql
-- Routine, RoutineStep, and RoutineCompletion queries.

-- name: CreateRoutine :one
INSERT INTO routines (
    id, household_id, name, member_id, days_of_week, time_slot, archived, sort_order, created_at, updated_at
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW()
)
RETURNING *;

-- name: GetRoutine :one
SELECT * FROM routines
WHERE id = $1 AND household_id = $2
LIMIT 1;

-- name: ListRoutines :many
SELECT * FROM routines
WHERE household_id = $1
  AND archived = FALSE
  AND (sqlc.narg(member_id)::uuid IS NULL OR member_id = sqlc.narg(member_id)::uuid)
  AND (sqlc.narg(time_slot)::text IS NULL OR time_slot = sqlc.narg(time_slot)::text)
ORDER BY sort_order ASC, created_at ASC;

-- name: UpdateRoutine :one
UPDATE routines
SET
    name         = COALESCE(sqlc.narg(name), name),
    member_id    = COALESCE(sqlc.narg(member_id), member_id),
    days_of_week = COALESCE(sqlc.narg(days_of_week), days_of_week),
    time_slot    = COALESCE(sqlc.narg(time_slot), time_slot),
    archived     = COALESCE(sqlc.narg(archived), archived),
    sort_order   = COALESCE(sqlc.narg(sort_order), sort_order),
    updated_at   = NOW()
WHERE id = $1 AND household_id = $2
RETURNING *;

-- name: DeleteRoutine :exec
DELETE FROM routines
WHERE id = $1 AND household_id = $2;

-- name: AddStep :one
INSERT INTO routine_steps (
    id, routine_id, name, est_minutes, sort_order, icon, created_at, updated_at
) VALUES (
    $1, $2, $3, $4, $5, $6, NOW(), NOW()
)
RETURNING *;

-- name: GetStep :one
SELECT s.* FROM routine_steps s
JOIN routines r ON r.id = s.routine_id
WHERE s.id = $1 AND r.household_id = $2
LIMIT 1;

-- name: ListSteps :many
SELECT * FROM routine_steps
WHERE routine_id = $1
ORDER BY sort_order ASC, created_at ASC;

-- name: UpdateStep :one
UPDATE routine_steps
SET
    name        = COALESCE(sqlc.narg(name), name),
    est_minutes = COALESCE(sqlc.narg(est_minutes), est_minutes),
    sort_order  = COALESCE(sqlc.narg(sort_order), sort_order),
    icon        = COALESCE(sqlc.narg(icon), icon),
    updated_at  = NOW()
WHERE id = $1
RETURNING *;

-- name: DeleteStep :exec
DELETE FROM routine_steps
WHERE id = $1;

-- name: MarkStepComplete :one
INSERT INTO routine_completions (id, routine_id, step_id, member_id, completed_at)
VALUES ($1, $2, $3, $4, NOW())
ON CONFLICT ON CONSTRAINT uq_routine_completion_step
DO UPDATE SET completed_at = NOW()
RETURNING *;

-- name: MarkRoutineComplete :one
INSERT INTO routine_completions (id, routine_id, step_id, member_id, completed_at)
VALUES ($1, $2, NULL, $3, NOW())
ON CONFLICT ON CONSTRAINT uq_routine_completion_whole
DO UPDATE SET completed_at = NOW()
RETURNING *;

-- name: UnmarkCompletion :exec
DELETE FROM routine_completions
WHERE id = $1;

-- name: ListCompletionsForDay :many
SELECT rc.*
FROM routine_completions rc
JOIN routines r ON r.id = rc.routine_id
WHERE r.household_id = $1
  AND rc.completed_at::DATE = $2
  AND (sqlc.narg(member_id)::uuid IS NULL OR rc.member_id = sqlc.narg(member_id)::uuid)
ORDER BY rc.completed_at ASC;

-- name: CountCompletionsForDay :one
SELECT COUNT(*)::BIGINT
FROM routine_completions
WHERE routine_id = $1
  AND member_id = $2
  AND completed_at::DATE = $3;

-- name: CountStepsForRoutine :one
SELECT COUNT(*)::BIGINT
FROM routine_steps
WHERE routine_id = $1;

-- name: GetDailyCompletionCounts :many
-- Returns (date, completion_count) for the past N days for a given routine+member.
SELECT
    completed_at::DATE AS day,
    COUNT(*)::BIGINT   AS completion_count
FROM routine_completions
WHERE routine_id = $1
  AND member_id  = $2
  AND completed_at >= $3
GROUP BY completed_at::DATE
ORDER BY day DESC;

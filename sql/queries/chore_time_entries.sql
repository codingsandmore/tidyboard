-- sql/queries/chore_time_entries.sql
-- Chore time-entry queries: timer start/stop, manual entries, member summaries.

-- name: StartChoreTimer :one
-- Open a new timer entry. The unique partial index uq_chore_time_entries_open
-- guarantees at most one open entry per (chore_id, member_id); a duplicate
-- insert raises a unique-violation that the service maps to 409.
INSERT INTO chore_time_entries (
    id, chore_id, member_id, started_at, source
) VALUES (
    $1, $2, $3, NOW(), 'timer'
)
RETURNING *;

-- name: GetOpenChoreTimer :one
SELECT * FROM chore_time_entries
WHERE chore_id = $1 AND member_id = $2 AND ended_at IS NULL
ORDER BY started_at DESC
LIMIT 1;

-- name: StopChoreTimer :one
-- Close the latest open entry for (chore_id, member_id). Server-set ended_at.
UPDATE chore_time_entries AS te
SET ended_at = NOW()
WHERE te.id = (
    SELECT t2.id FROM chore_time_entries AS t2
    WHERE t2.chore_id = $1 AND t2.member_id = $2 AND t2.ended_at IS NULL
    ORDER BY t2.started_at DESC
    LIMIT 1
)
RETURNING te.*;

-- name: InsertManualTimeEntry :one
INSERT INTO chore_time_entries (
    id, chore_id, member_id, started_at, ended_at, note, source
) VALUES (
    $1, $2, $3, $4, $5, $6, 'manual'
)
RETURNING *;

-- name: ListChoreTimeEntries :many
SELECT te.* FROM chore_time_entries te
JOIN chores c ON c.id = te.chore_id
WHERE c.household_id = $1
  AND (sqlc.narg(member_id)::uuid IS NULL OR te.member_id = sqlc.narg(member_id)::uuid)
  AND (sqlc.narg(chore_id)::uuid IS NULL OR te.chore_id = sqlc.narg(chore_id)::uuid)
  AND te.started_at >= $2
  AND te.started_at < $3
ORDER BY te.started_at DESC;

-- name: GetMemberTimeSummary :one
-- Aggregate completed entries for a member over [from, to) (half-open).
-- Only counts closed entries (duration_seconds IS NOT NULL).
SELECT
    COUNT(*)::BIGINT                                AS entry_count,
    COALESCE(SUM(duration_seconds), 0)::BIGINT      AS total_seconds
FROM chore_time_entries
WHERE member_id = $1
  AND started_at >= $2
  AND started_at < $3
  AND ended_at IS NOT NULL;

-- name: GetMemberTimeSummaryByChore :many
SELECT
    chore_id,
    COUNT(*)::BIGINT                                AS entry_count,
    COALESCE(SUM(duration_seconds), 0)::BIGINT      AS total_seconds
FROM chore_time_entries
WHERE member_id = $1
  AND started_at >= $2
  AND started_at < $3
  AND ended_at IS NOT NULL
GROUP BY chore_id
ORDER BY total_seconds DESC;

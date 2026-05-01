-- sql/queries/housekeeper.sql
-- Housekeeper-rate estimation queries.

-- name: SumChoreTimeByCategory :many
-- Aggregate completed chore_time_entries grouped by chores.category for a
-- household over [from, to). Excludes uncategorized chores (NULL category)
-- and open entries (ended_at IS NULL).
SELECT
    c.category::TEXT                                AS category,
    COALESCE(SUM(te.duration_seconds), 0)::BIGINT   AS total_seconds
FROM chore_time_entries te
JOIN chores c ON c.id = te.chore_id
WHERE c.household_id = $1
  AND c.category IS NOT NULL
  AND te.started_at >= $2
  AND te.started_at <  $3
  AND te.ended_at  IS NOT NULL
GROUP BY c.category
ORDER BY c.category ASC;

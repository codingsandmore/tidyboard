-- sql/queries/equity_contribution.sql
-- Equity-contribution aggregate: sum minutes from BOTH task_logs (existing
-- equity tasks, minutes-resolution) AND chore_time_entries (new chore timer,
-- seconds-resolution converted to minutes) per member over [from, to].
--
-- Section E.1+E.2 + G.4 of docs/specs/2026-05-01-fairplay-design.md.
-- Privacy: this query also returns the (private) hourly_rate_cents_min/max so
-- the service layer can compute totals — the service is responsible for
-- redacting these values before returning to a non-privileged viewer (see
-- internal/service/equity.go::Contribution).

-- name: EquityContributionAggregate :many
WITH task_log_minutes AS (
    SELECT tl.member_id,
           SUM(tl.duration_minutes)::BIGINT AS minutes
    FROM task_logs tl
    WHERE tl.household_id = $1
      AND tl.started_at >= $2
      AND tl.started_at <  $3
    GROUP BY tl.member_id
),
chore_minutes AS (
    SELECT te.member_id,
           (COALESCE(SUM(te.duration_seconds), 0) / 60)::BIGINT AS minutes
    FROM chore_time_entries te
    JOIN chores c ON c.id = te.chore_id
    WHERE c.household_id = $1
      AND te.ended_at IS NOT NULL
      AND te.started_at >= $2
      AND te.started_at <  $3
    GROUP BY te.member_id
),
combined AS (
    SELECT member_id, minutes FROM task_log_minutes
    UNION ALL
    SELECT member_id, minutes FROM chore_minutes
),
per_member AS (
    SELECT member_id,
           SUM(minutes)::BIGINT AS total_minutes
    FROM combined
    GROUP BY member_id
)
SELECT
    m.id                              AS member_id,
    COALESCE(pm.total_minutes, 0)::BIGINT AS total_minutes,
    m.hourly_rate_cents_min,
    m.hourly_rate_cents_max
FROM members m
JOIN per_member pm ON pm.member_id = m.id
WHERE m.household_id = $1
ORDER BY m.id;

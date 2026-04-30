-- sql/queries/equity.sql
-- Equity engine queries. Run `sqlc generate` to produce Go code in internal/query/.

-- ── Task Domains ─────────────────────────────────────────────────────────────

-- name: ListTaskDomains :many
SELECT d.*, o.owner_member_id
FROM task_domains d
LEFT JOIN domain_ownerships o ON o.domain_id = d.id
WHERE d.household_id = $1
ORDER BY d.sort_order, d.name;

-- name: GetTaskDomain :one
SELECT d.*, o.owner_member_id
FROM task_domains d
LEFT JOIN domain_ownerships o ON o.domain_id = d.id
WHERE d.id = $1 AND d.household_id = $2;

-- name: CreateTaskDomain :one
INSERT INTO task_domains (household_id, name, icon, description, is_system, sort_order)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING *;

-- name: UpdateTaskDomain :one
UPDATE task_domains
SET name = $3, icon = $4, description = $5, sort_order = $6, updated_at = NOW()
WHERE id = $1 AND household_id = $2
RETURNING *;

-- name: DeleteTaskDomain :exec
DELETE FROM task_domains
WHERE id = $1 AND household_id = $2 AND is_system = false;

-- name: UpsertDomainOwnership :one
INSERT INTO domain_ownerships (household_id, domain_id, owner_member_id, assigned_by_member_id, notes)
VALUES ($1, $2, $3, $4, $5)
ON CONFLICT (domain_id) DO UPDATE
  SET owner_member_id = EXCLUDED.owner_member_id,
      assigned_by_member_id = EXCLUDED.assigned_by_member_id,
      notes = EXCLUDED.notes,
      assigned_at = NOW()
RETURNING *;

-- ── Equity Tasks ─────────────────────────────────────────────────────────────

-- name: ListEquityTasks :many
SELECT * FROM equity_tasks
WHERE household_id = $1 AND archived = false
ORDER BY domain_id, name;

-- name: ListEquityTasksByDomain :many
SELECT * FROM equity_tasks
WHERE household_id = $1 AND domain_id = $2 AND archived = false
ORDER BY name;

-- name: GetEquityTask :one
SELECT * FROM equity_tasks
WHERE id = $1 AND household_id = $2;

-- name: CreateEquityTask :one
INSERT INTO equity_tasks (household_id, domain_id, name, task_type, recurrence, est_minutes, owner_member_id, share_pct)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
RETURNING *;

-- name: UpdateEquityTask :one
UPDATE equity_tasks
SET domain_id       = $3,
    name            = $4,
    task_type       = $5,
    recurrence      = $6,
    est_minutes     = $7,
    owner_member_id = $8,
    share_pct       = $9,
    archived        = $10,
    updated_at      = NOW()
WHERE id = $1 AND household_id = $2
RETURNING *;

-- name: ArchiveEquityTask :exec
UPDATE equity_tasks
SET archived = true, updated_at = NOW()
WHERE id = $1 AND household_id = $2;

-- ── Task Logs ────────────────────────────────────────────────────────────────

-- name: CreateTaskLog :one
INSERT INTO task_logs (task_id, household_id, member_id, started_at, duration_minutes, is_cognitive, notes, source)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
RETURNING *;

-- name: ListTaskLogs :many
SELECT tl.*, et.name AS task_name, et.task_type, et.domain_id
FROM task_logs tl
JOIN equity_tasks et ON et.id = tl.task_id
WHERE tl.household_id = $1
  AND tl.started_at >= $2
  AND tl.started_at <= $3
ORDER BY tl.started_at DESC;

-- name: SumMinutesByMember :many
-- Returns total minutes logged per member within a time window.
SELECT
    tl.member_id,
    SUM(tl.duration_minutes)                                              AS total_minutes,
    SUM(CASE WHEN tl.is_cognitive THEN tl.duration_minutes ELSE 0 END)   AS cognitive_minutes,
    SUM(CASE WHEN NOT tl.is_cognitive THEN tl.duration_minutes ELSE 0 END) AS physical_minutes
FROM task_logs tl
WHERE tl.household_id = $1
  AND tl.started_at >= $2
  AND tl.started_at <= $3
GROUP BY tl.member_id;

-- name: SumMinutesByMemberAndDomain :many
-- Returns minutes per (member, domain) for the equity domain detail view.
SELECT
    tl.member_id,
    et.domain_id,
    SUM(tl.duration_minutes) AS total_minutes
FROM task_logs tl
JOIN equity_tasks et ON et.id = tl.task_id
WHERE tl.household_id = $1
  AND tl.started_at >= $2
  AND tl.started_at <= $3
GROUP BY tl.member_id, et.domain_id;

-- name: CountTasksByDomain :many
-- Returns (domain_id, owner_member_id, task_count) for all active tasks.
SELECT
    et.domain_id,
    et.owner_member_id,
    COUNT(*) AS task_count
FROM equity_tasks et
WHERE et.household_id = $1 AND et.archived = false
GROUP BY et.domain_id, et.owner_member_id;

-- name: WeeklyMinutesByMember :many
-- Returns weekly aggregates for trend chart (last N weeks).
SELECT
    tl.member_id,
    date_trunc('week', tl.started_at)::timestamptz AS week_start,
    SUM(tl.duration_minutes)                        AS total_minutes
FROM task_logs tl
WHERE tl.household_id = $1
  AND tl.started_at >= $2
GROUP BY tl.member_id, date_trunc('week', tl.started_at)
ORDER BY week_start;

-- sql/queries/event.sql
-- Event queries. Run `sqlc generate` to produce Go code in internal/query/.

-- name: CreateEvent :one
INSERT INTO events (
    id,
    household_id,
    calendar_id,
    external_id,
    title,
    description,
    start_time,
    end_time,
    all_day,
    location,
    recurrence_rule,
    assigned_members,
    reminders,
    created_at,
    updated_at
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW()
)
RETURNING *;

-- name: GetEvent :one
SELECT * FROM events
WHERE id = $1 AND household_id = $2
LIMIT 1;

-- name: ListEventsInRange :many
SELECT * FROM events
WHERE household_id = $1
  AND (sqlc.narg(start_time)::timestamptz IS NULL OR end_time   >= sqlc.narg(start_time))
  AND (sqlc.narg(end_time)::timestamptz   IS NULL OR start_time <= sqlc.narg(end_time))
ORDER BY start_time ASC;

-- name: UpdateEvent :one
UPDATE events
SET
    title           = COALESCE(sqlc.narg(title), title),
    description     = COALESCE(sqlc.narg(description), description),
    start_time      = COALESCE(sqlc.narg(start_time), start_time),
    end_time        = COALESCE(sqlc.narg(end_time), end_time),
    all_day         = COALESCE(sqlc.narg(all_day), all_day),
    location        = COALESCE(sqlc.narg(location), location),
    recurrence_rule = COALESCE(sqlc.narg(recurrence_rule), recurrence_rule),
    assigned_members = COALESCE(sqlc.narg(assigned_members), assigned_members),
    updated_at      = NOW()
WHERE id = $1 AND household_id = $2
RETURNING *;

-- name: DeleteEvent :exec
DELETE FROM events
WHERE id = $1 AND household_id = $2;

-- name: GetEventByExternalID :one
SELECT * FROM events
WHERE external_id = $1 AND household_id = $2
LIMIT 1;

-- name: UpsertEventByExternalID :one
INSERT INTO events (
    id,
    household_id,
    calendar_id,
    external_id,
    title,
    description,
    start_time,
    end_time,
    all_day,
    location,
    recurrence_rule,
    assigned_members,
    reminders,
    created_at,
    updated_at
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW()
)
ON CONFLICT (household_id, external_id) WHERE external_id IS NOT NULL
DO UPDATE SET
    title           = EXCLUDED.title,
    description     = EXCLUDED.description,
    start_time      = EXCLUDED.start_time,
    end_time        = EXCLUDED.end_time,
    all_day         = EXCLUDED.all_day,
    location        = EXCLUDED.location,
    recurrence_rule = EXCLUDED.recurrence_rule,
    updated_at      = NOW()
RETURNING *;

-- name: GetCalendar :one
SELECT * FROM calendars
WHERE id = $1 AND household_id = $2
LIMIT 1;

-- name: ListCalendars :many
SELECT * FROM calendars
WHERE household_id = $1
ORDER BY created_at;

-- name: CreateCalendar :one
INSERT INTO calendars (id, household_id, name, source, url)
VALUES ($1, $2, $3, $4, $5)
RETURNING *;

-- sql/queries/member.sql
-- Member queries. Run `sqlc generate` to produce Go code in internal/query/.

-- name: CreateMember :one
INSERT INTO members (
    id,
    household_id,
    account_id,
    name,
    display_name,
    color,
    avatar_url,
    role,
    age_group,
    pin_hash,
    emergency_info,
    notification_preferences,
    created_at,
    updated_at
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW()
)
RETURNING *;

-- name: GetMember :one
SELECT * FROM members
WHERE id = $1 AND household_id = $2
LIMIT 1;

-- name: GetMembersByIDs :many
-- Returns rows for the supplied member IDs scoped to a single household.
-- Used to validate that assigned_members on events/chores belong to the
-- caller's household. Foreign or unknown IDs are simply absent from the
-- result; the caller compares input vs returned cardinality to detect them.
SELECT * FROM members
WHERE household_id = $1 AND id = ANY(@ids::uuid[]);

-- name: ListMembers :many
SELECT * FROM members
WHERE household_id = $1
ORDER BY created_at ASC;

-- name: UpdateMember :one
UPDATE members
SET
    name                     = COALESCE(sqlc.narg(name), name),
    display_name             = COALESCE(sqlc.narg(display_name), display_name),
    color                    = COALESCE(sqlc.narg(color), color),
    avatar_url               = COALESCE(sqlc.narg(avatar_url), avatar_url),
    role                     = COALESCE(sqlc.narg(role), role),
    age_group                = COALESCE(sqlc.narg(age_group), age_group),
    pin_hash                 = COALESCE(sqlc.narg(pin_hash), pin_hash),
    notification_preferences = COALESCE(sqlc.narg(notification_preferences), notification_preferences),
    updated_at               = NOW()
WHERE id = $1 AND household_id = $2
RETURNING *;

-- name: DeleteMember :exec
DELETE FROM members
WHERE id = $1 AND household_id = $2;

-- name: GetMemberByAccountAndHousehold :one
SELECT * FROM members
WHERE account_id = $1 AND household_id = $2
LIMIT 1;

-- name: UpdateMemberNotify :one
UPDATE members
SET
    ntfy_topic               = COALESCE(sqlc.narg(ntfy_topic), ntfy_topic),
    notification_preferences = COALESCE(sqlc.narg(notification_preferences), notification_preferences),
    updated_at               = NOW()
WHERE id = $1 AND household_id = $2
RETURNING *;

-- name: GetPrimaryMemberByAccount :one
-- Returns the user's earliest-created membership; used by the auth middleware
-- to populate household + role context for users that belong to one or more
-- households. New users with no household yet get pgx.ErrNoRows here, which
-- the middleware treats as "valid login, no household yet".
SELECT id, household_id, role FROM members
WHERE account_id = $1
ORDER BY created_at
LIMIT 1;

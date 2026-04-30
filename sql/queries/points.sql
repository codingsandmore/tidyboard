-- sql/queries/points.sql

-- ── Categories ──────────────────────────────────────────────────────────────

-- name: CreatePointCategory :one
INSERT INTO point_categories (id, household_id, name, color, sort_order, created_at, updated_at)
VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
RETURNING *;

-- name: GetPointCategory :one
SELECT * FROM point_categories WHERE id = $1 AND household_id = $2 LIMIT 1;

-- name: ListPointCategories :many
SELECT * FROM point_categories
WHERE household_id = $1
  AND (sqlc.arg(include_archived)::boolean OR archived_at IS NULL)
ORDER BY sort_order ASC, name ASC;

-- name: UpdatePointCategory :one
UPDATE point_categories
SET name        = COALESCE(sqlc.narg(name), name),
    color       = COALESCE(sqlc.narg(color), color),
    sort_order  = COALESCE(sqlc.narg(sort_order), sort_order),
    updated_at  = NOW()
WHERE id = $1 AND household_id = $2
RETURNING *;

-- name: ArchivePointCategory :exec
UPDATE point_categories SET archived_at = NOW(), updated_at = NOW()
WHERE id = $1 AND household_id = $2;

-- ── Behaviors ───────────────────────────────────────────────────────────────

-- name: CreateBehavior :one
INSERT INTO behaviors (id, household_id, category_id, name, suggested_points, created_at, updated_at)
VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
RETURNING *;

-- name: GetBehavior :one
SELECT * FROM behaviors WHERE id = $1 AND household_id = $2 LIMIT 1;

-- name: ListBehaviors :many
SELECT * FROM behaviors
WHERE household_id = $1
  AND (sqlc.narg(category_id)::uuid IS NULL OR category_id = sqlc.narg(category_id)::uuid)
  AND (sqlc.arg(include_archived)::boolean OR archived_at IS NULL)
ORDER BY name ASC;

-- name: UpdateBehavior :one
UPDATE behaviors
SET name             = COALESCE(sqlc.narg(name), name),
    category_id      = COALESCE(sqlc.narg(category_id)::uuid, category_id),
    suggested_points = COALESCE(sqlc.narg(suggested_points), suggested_points),
    updated_at       = NOW()
WHERE id = $1 AND household_id = $2
RETURNING *;

-- name: ArchiveBehavior :exec
UPDATE behaviors SET archived_at = NOW(), updated_at = NOW()
WHERE id = $1 AND household_id = $2;

-- ── Point grants ────────────────────────────────────────────────────────────

-- name: CreatePointGrant :one
INSERT INTO point_grants (id, household_id, member_id, category_id, behavior_id, points, reason, granted_by_account_id, granted_at)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
RETURNING *;

-- name: GetPointGrant :one
SELECT * FROM point_grants WHERE id = $1 LIMIT 1;

-- name: ListPointGrants :many
SELECT * FROM point_grants
WHERE household_id = $1
  AND (sqlc.narg(member_id)::uuid IS NULL OR member_id = sqlc.narg(member_id)::uuid)
ORDER BY granted_at DESC
LIMIT $2 OFFSET $3;

-- name: SumPointsByMember :one
SELECT COALESCE(SUM(points), 0)::BIGINT AS total
FROM point_grants
WHERE member_id = $1;

-- name: SumPointsByMemberAndCategory :many
SELECT category_id, COALESCE(SUM(points), 0)::BIGINT AS total
FROM point_grants
WHERE member_id = $1
GROUP BY category_id;

-- name: ScoreboardTotals :many
SELECT m.id AS member_id, COALESCE(SUM(pg.points), 0)::BIGINT AS total
FROM members m
LEFT JOIN point_grants pg ON pg.member_id = m.id
WHERE m.household_id = $1
GROUP BY m.id
ORDER BY total DESC;

-- name: ScoreboardByCategory :many
SELECT m.id AS member_id, pg.category_id, COALESCE(SUM(pg.points), 0)::BIGINT AS total
FROM members m
LEFT JOIN point_grants pg ON pg.member_id = m.id
WHERE m.household_id = $1
GROUP BY m.id, pg.category_id;

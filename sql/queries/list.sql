-- sql/queries/list.sql
-- List and ListItem queries. Run `sqlc generate` to produce Go code in internal/query/.

-- name: CreateList :one
INSERT INTO lists (
    id,
    household_id,
    name,
    type,
    shared,
    assigned_member_id,
    created_at,
    updated_at
) VALUES (
    $1, $2, $3, $4, $5, $6, NOW(), NOW()
)
RETURNING *;

-- name: GetList :one
SELECT * FROM lists
WHERE id = $1 AND household_id = $2
LIMIT 1;

-- name: ListLists :many
SELECT * FROM lists
WHERE household_id = $1
ORDER BY created_at ASC;

-- name: UpdateList :one
UPDATE lists
SET
    name               = COALESCE(sqlc.narg(name), name),
    shared             = COALESCE(sqlc.narg(shared), shared),
    assigned_member_id = COALESCE(sqlc.narg(assigned_member_id), assigned_member_id),
    updated_at         = NOW()
WHERE id = $1 AND household_id = $2
RETURNING *;

-- name: DeleteList :exec
DELETE FROM lists
WHERE id = $1 AND household_id = $2;

-- name: CreateListItem :one
INSERT INTO list_items (
    id,
    list_id,
    household_id,
    text,
    completed,
    assigned_member_id,
    due_date,
    priority,
    sort_order,
    created_at,
    updated_at
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW()
)
RETURNING *;

-- name: GetListItem :one
SELECT * FROM list_items
WHERE id = $1 AND list_id = $2 AND household_id = $3
LIMIT 1;

-- name: ListItems :many
SELECT * FROM list_items
WHERE list_id = $1 AND household_id = $2
ORDER BY sort_order ASC, created_at ASC;

-- name: UpdateListItem :one
UPDATE list_items
SET
    text               = COALESCE(sqlc.narg(text), text),
    completed          = COALESCE(sqlc.narg(completed), completed),
    assigned_member_id = COALESCE(sqlc.narg(assigned_member_id), assigned_member_id),
    due_date           = COALESCE(sqlc.narg(due_date), due_date),
    priority           = COALESCE(sqlc.narg(priority), priority),
    sort_order         = COALESCE(sqlc.narg(sort_order), sort_order),
    updated_at         = NOW()
WHERE id = $1 AND list_id = $2 AND household_id = $3
RETURNING *;

-- name: DeleteListItem :exec
DELETE FROM list_items
WHERE id = $1 AND list_id = $2 AND household_id = $3;

-- name: CompleteAllItems :exec
UPDATE list_items
SET completed = true, updated_at = NOW()
WHERE list_id = $1 AND household_id = $2;

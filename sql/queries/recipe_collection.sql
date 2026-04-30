-- sql/queries/recipe_collection.sql
-- Recipe collection queries. Run `sqlc generate` to produce Go code in internal/query/.

-- name: CreateRecipeCollection :one
INSERT INTO recipe_collections (id, household_id, name, slug, sort_order)
VALUES ($1, $2, $3, $4, $5)
RETURNING *;

-- name: GetRecipeCollection :one
SELECT * FROM recipe_collections
WHERE id = $1 AND household_id = $2
LIMIT 1;

-- name: ListRecipeCollections :many
SELECT * FROM recipe_collections
WHERE household_id = $1
ORDER BY sort_order ASC, created_at ASC;

-- name: UpdateRecipeCollection :one
UPDATE recipe_collections
SET
    name       = COALESCE(sqlc.narg(name), name),
    slug       = COALESCE(sqlc.narg(slug), slug),
    sort_order = COALESCE(sqlc.narg(sort_order), sort_order),
    updated_at = NOW()
WHERE id = $1 AND household_id = $2
RETURNING *;

-- name: DeleteRecipeCollection :exec
DELETE FROM recipe_collections
WHERE id = $1 AND household_id = $2;

-- name: AddRecipeToCollection :exec
INSERT INTO recipe_collection_items (collection_id, recipe_id, sort_order)
VALUES ($1, $2, $3)
ON CONFLICT (collection_id, recipe_id) DO NOTHING;

-- name: RemoveRecipeFromCollection :exec
DELETE FROM recipe_collection_items
WHERE collection_id = $1 AND recipe_id = $2;

-- name: ListRecipesByCollection :many
SELECT r.*
FROM recipes r
INNER JOIN recipe_collection_items rci ON rci.recipe_id = r.id
WHERE rci.collection_id = $1 AND r.household_id = $2
ORDER BY rci.sort_order ASC, rci.added_at ASC;

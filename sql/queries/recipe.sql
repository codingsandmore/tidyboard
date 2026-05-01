-- sql/queries/recipe.sql
-- Recipe queries. Run `sqlc generate` to produce Go code in internal/query/.

-- name: CreateRecipe :one
INSERT INTO recipes (
    id,
    household_id,
    title,
    description,
    source_url,
    source_domain,
    image_url,
    prep_time,
    cook_time,
    total_time,
    servings,
    servings_unit,
    categories,
    cuisine,
    tags,
    difficulty,
    rating,
    notes,
    is_favorite,
    times_cooked,
    last_cooked_at,
    created_by,
    created_at,
    updated_at
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
    $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
    $21, $22, NOW(), NOW()
)
RETURNING *;

-- name: GetRecipe :one
SELECT * FROM recipes
WHERE id = $1 AND household_id = $2
LIMIT 1;

-- name: ListRecipes :many
SELECT * FROM recipes
WHERE household_id = $1
ORDER BY created_at DESC;

-- name: SearchRecipes :many
SELECT * FROM recipes
WHERE household_id = $1
  AND (
      title ILIKE '%' || $2 || '%'
      OR notes ILIKE '%' || $2 || '%'
      OR cuisine ILIKE '%' || $2 || '%'
  )
ORDER BY created_at DESC;

-- name: UpdateRecipe :one
UPDATE recipes
SET
    title        = COALESCE(sqlc.narg(title), title),
    notes        = COALESCE(sqlc.narg(notes), notes),
    rating       = COALESCE(sqlc.narg(rating), rating),
    is_favorite  = COALESCE(sqlc.narg(is_favorite), is_favorite),
    tags         = COALESCE(sqlc.narg(tags), tags),
    categories   = COALESCE(sqlc.narg(categories), categories),
    difficulty   = COALESCE(sqlc.narg(difficulty), difficulty),
    updated_at   = NOW()
WHERE id = $1 AND household_id = $2
RETURNING *;

-- name: DeleteRecipe :exec
DELETE FROM recipes
WHERE id = $1 AND household_id = $2;

-- name: IncrementTimesCooked :one
UPDATE recipes
SET
    times_cooked   = times_cooked + 1,
    last_cooked_at = NOW(),
    updated_at     = NOW()
WHERE id = $1 AND household_id = $2
RETURNING *;

-- name: GetRecipeBySourceURL :one
SELECT * FROM recipes
WHERE source_url = $1 AND household_id = $2
LIMIT 1;

-- name: ListFavoriteRecipes :many
SELECT * FROM recipes
WHERE household_id = $1 AND is_favorite = true
ORDER BY updated_at DESC;

-- name: ListRecipeIngredients :many
SELECT * FROM recipe_ingredients
WHERE recipe_id = $1 AND household_id = $2
ORDER BY sort_order ASC, name ASC;

-- name: ListRecipeSteps :many
SELECT * FROM recipe_steps
WHERE recipe_id = $1 AND household_id = $2
ORDER BY sort_order ASC;

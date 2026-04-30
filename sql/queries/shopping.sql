-- sql/queries/shopping.sql
-- Shopping list queries. Run `sqlc generate` to produce Go code in internal/query/.

-- name: CreateShoppingList :one
INSERT INTO shopping_lists (household_id, name, date_from, date_to, is_active)
VALUES ($1, $2, $3, $4, true)
RETURNING *;

-- name: GetActiveShoppingList :one
SELECT * FROM shopping_lists
WHERE household_id = $1 AND is_active = true
ORDER BY created_at DESC
LIMIT 1;

-- name: GetShoppingList :one
SELECT * FROM shopping_lists
WHERE id = $1 AND household_id = $2
LIMIT 1;

-- name: DeactivateShoppingLists :exec
UPDATE shopping_lists
SET is_active = false, updated_at = NOW()
WHERE household_id = $1 AND is_active = true;

-- name: InsertShoppingListItem :one
INSERT INTO shopping_list_items (shopping_list_id, household_id, name, amount, unit, aisle, source_recipes, completed, sort_order)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
RETURNING *;

-- name: ListShoppingListItems :many
SELECT * FROM shopping_list_items
WHERE shopping_list_id = $1
ORDER BY aisle, sort_order, name;

-- name: UpdateShoppingListItem :one
UPDATE shopping_list_items
SET completed = $3, updated_at = NOW()
WHERE id = $1 AND household_id = $2
RETURNING *;

-- name: DeleteShoppingListItems :exec
DELETE FROM shopping_list_items
WHERE shopping_list_id = $1;

-- Pantry staples

-- name: UpsertPantryStaple :one
INSERT INTO pantry_staples (household_id, name, amount, unit, aisle)
VALUES ($1, $2, $3, $4, $5)
ON CONFLICT (household_id, name)
DO UPDATE SET amount = EXCLUDED.amount, unit = EXCLUDED.unit, aisle = EXCLUDED.aisle, updated_at = NOW()
RETURNING *;

-- name: ListPantryStaples :many
SELECT * FROM pantry_staples
WHERE household_id = $1
ORDER BY aisle, name;

-- name: DeletePantryStaple :exec
DELETE FROM pantry_staples
WHERE id = $1 AND household_id = $2;

-- Ingredient join for shopping list generation:
-- fetch all recipe_ingredients for recipes that appear in meal plan entries
-- within the given date range for the household.

-- name: ListIngredientsForMealPlanRange :many
SELECT
    r.id AS recipe_id,
    ri.name,
    ri.amount,
    ri.unit,
    ri.optional,
    r.title      AS recipe_title,
    COALESCE(ic.category, '') AS aisle
FROM meal_plan_entries mpe
JOIN recipes            r   ON r.id = mpe.recipe_id
JOIN recipe_ingredients ri  ON ri.recipe_id = r.id
LEFT JOIN ingredient_canonical ic ON ic.name ILIKE ri.name
WHERE mpe.household_id = $1
  AND mpe.date >= $2
  AND mpe.date <= $3
  AND mpe.recipe_id IS NOT NULL
ORDER BY aisle, ri.name;

-- Canonical ingredient search

-- name: SearchIngredients :many
SELECT * FROM ingredient_canonical
WHERE name ILIKE '%' || $1 || '%'
   OR EXISTS (
       SELECT 1 FROM unnest(aliases) AS a WHERE a ILIKE '%' || $1 || '%'
   )
ORDER BY name
LIMIT 25;

-- sql/queries/meal_plan.sql
-- Meal plan entry queries. Run `sqlc generate` to produce Go code in internal/query/.

-- name: UpsertMealPlanEntry :one
INSERT INTO meal_plan_entries (id, household_id, recipe_id, date, slot, created_at, updated_at)
VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW(), NOW())
ON CONFLICT (household_id, date, slot)
DO UPDATE SET
    recipe_id  = EXCLUDED.recipe_id,
    updated_at = NOW()
RETURNING *;

-- name: ListMealPlanEntries :many
SELECT * FROM meal_plan_entries
WHERE household_id = $1
  AND date >= $2
  AND date <= $3
ORDER BY date, slot;

-- name: DeleteMealPlanEntry :exec
DELETE FROM meal_plan_entries
WHERE id = $1 AND household_id = $2;

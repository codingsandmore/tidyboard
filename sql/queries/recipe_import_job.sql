-- name: CreateRecipeImportJob :one
INSERT INTO recipe_import_jobs (
    id,
    household_id,
    member_id,
    url,
    status,
    error_message,
    recipe_id,
    created_at,
    updated_at
) VALUES (
    $1, $2, $3, $4, 'running', '', NULL, NOW(), NOW()
)
RETURNING id, household_id, member_id, url, status, error_message, recipe_id, created_at, updated_at;

-- name: GetRecipeImportJob :one
SELECT id, household_id, member_id, url, status, error_message, recipe_id, created_at, updated_at
FROM recipe_import_jobs
WHERE id = $1 AND household_id = $2;

-- name: MarkRecipeImportJobSucceeded :exec
UPDATE recipe_import_jobs
SET status = 'succeeded',
    recipe_id = $2,
    error_message = '',
    updated_at = NOW()
WHERE id = $1;

-- name: MarkRecipeImportJobFailed :exec
UPDATE recipe_import_jobs
SET status = 'failed',
    error_message = $2,
    updated_at = NOW()
WHERE id = $1;

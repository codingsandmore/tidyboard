-- sql/queries/account.sql
-- Account queries. Run `sqlc generate` to produce Go code in internal/query/.

-- name: CreateAccount :one
INSERT INTO accounts (
    id,
    email,
    password_hash,
    oidc_provider,
    oidc_subject,
    is_active,
    created_at,
    updated_at
) VALUES (
    $1, $2, $3, $4, $5, $6, NOW(), NOW()
)
RETURNING *;

-- name: GetAccountByID :one
SELECT * FROM accounts
WHERE id = $1
LIMIT 1;

-- name: GetAccountByEmail :one
SELECT * FROM accounts
WHERE email = $1
LIMIT 1;

-- name: UpdateAccount :one
UPDATE accounts
SET
    email      = COALESCE(sqlc.narg(email), email),
    is_active  = COALESCE(sqlc.narg(is_active), is_active),
    updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: DeactivateAccount :exec
UPDATE accounts
SET is_active = false, updated_at = NOW()
WHERE id = $1;

-- sql/queries/oauth.sql
-- OAuth token queries. Run `sqlc generate` to produce Go code.

-- name: UpsertOAuthToken :one
INSERT INTO oauth_tokens (
    id,
    account_id,
    provider,
    access_token_encrypted,
    refresh_token_encrypted,
    token_expiry,
    scopes,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW(), NOW()
)
ON CONFLICT (account_id, provider) DO UPDATE SET
    access_token_encrypted  = EXCLUDED.access_token_encrypted,
    refresh_token_encrypted = EXCLUDED.refresh_token_encrypted,
    token_expiry            = EXCLUDED.token_expiry,
    scopes                  = EXCLUDED.scopes,
    updated_at              = NOW()
RETURNING *;

-- name: GetOAuthToken :one
SELECT * FROM oauth_tokens
WHERE account_id = $1 AND provider = $2
LIMIT 1;

-- name: DeleteOAuthToken :exec
DELETE FROM oauth_tokens
WHERE account_id = $1 AND provider = $2;

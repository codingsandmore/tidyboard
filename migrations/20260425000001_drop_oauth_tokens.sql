-- +goose Up
-- +goose StatementBegin

-- The home-rolled Google OAuth flow is gone — Cognito federates Google now.
-- This table held per-account access/refresh tokens that the previous flow
-- managed itself. Cognito holds tokens internally; we don't need a copy.
DROP TABLE IF EXISTS oauth_tokens;

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

-- Down can't restore data; recreates the empty table to match the prior schema
-- so a follow-up `goose down` to a pre-cutover migration won't error out.
CREATE TABLE IF NOT EXISTS oauth_tokens (
    id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id              UUID        NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    provider                TEXT        NOT NULL CHECK (provider IN ('google')),
    access_token_encrypted  TEXT        NOT NULL DEFAULT '',
    refresh_token_encrypted TEXT        NOT NULL DEFAULT '',
    token_expiry            TIMESTAMPTZ,
    scopes                  TEXT[]      NOT NULL DEFAULT '{}',
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (account_id, provider)
);

-- +goose StatementEnd

-- +goose Up
-- +goose StatementBegin

CREATE TABLE oauth_tokens (
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

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS oauth_tokens;
-- +goose StatementEnd

-- +goose Up
-- +goose StatementBegin

CREATE TABLE households (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT        NOT NULL,
    timezone    TEXT        NOT NULL DEFAULT 'UTC',
    settings    JSONB       NOT NULL DEFAULT '{}',
    created_by  UUID        NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
    invite_code TEXT        NOT NULL UNIQUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_households_created_by  ON households (created_by);
CREATE INDEX idx_households_invite_code ON households (invite_code);

CREATE TABLE invitations (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID        NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    email        TEXT        NOT NULL,
    role         TEXT        NOT NULL DEFAULT 'member'
                             CHECK (role IN ('admin','member','guest')),
    token        TEXT        NOT NULL UNIQUE,
    invited_by   UUID        NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at   TIMESTAMPTZ NOT NULL,
    accepted_at  TIMESTAMPTZ,
    status       TEXT        NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending','accepted','expired','revoked'))
);

CREATE INDEX idx_invitations_household ON invitations (household_id);
CREATE INDEX idx_invitations_token     ON invitations (token);
CREATE INDEX idx_invitations_email     ON invitations (email);

CREATE TABLE join_requests (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID        NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    account_id   UUID        NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_by  UUID        REFERENCES accounts(id),
    reviewed_at  TIMESTAMPTZ,
    status       TEXT        NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending','approved','rejected'))
);

CREATE INDEX idx_join_requests_household ON join_requests (household_id);

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS join_requests;
DROP TABLE IF EXISTS invitations;
DROP TABLE IF EXISTS households;
-- +goose StatementEnd

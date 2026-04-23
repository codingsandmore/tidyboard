-- +goose Up
-- +goose StatementBegin

CREATE TABLE members (
    id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id             UUID        NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    account_id               UUID        REFERENCES accounts(id) ON DELETE SET NULL,
    name                     TEXT        NOT NULL,
    display_name             TEXT        NOT NULL,
    color                    TEXT        NOT NULL DEFAULT '#4A90E2',
    avatar_url               TEXT        NOT NULL DEFAULT '',
    role                     TEXT        NOT NULL DEFAULT 'member'
                                         CHECK (role IN ('owner','admin','member','child','guest')),
    age_group                TEXT        NOT NULL DEFAULT 'adult'
                                         CHECK (age_group IN ('toddler','child','tween','teen','adult')),
    pin_hash                 TEXT,                          -- bcrypt hash, nullable
    emergency_info           JSONB       NOT NULL DEFAULT '{}',
    notification_preferences JSONB       NOT NULL DEFAULT '{}',
    created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_members_household    ON members (household_id);
CREATE INDEX idx_members_account      ON members (account_id) WHERE account_id IS NOT NULL;

-- Only one owner per household
CREATE UNIQUE INDEX idx_members_one_owner ON members (household_id)
    WHERE role = 'owner';

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS members;
-- +goose StatementEnd

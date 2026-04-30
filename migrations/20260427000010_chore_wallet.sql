-- +goose Up
-- +goose StatementBegin
CREATE TABLE chores (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id    UUID        NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    member_id       UUID        NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    name            TEXT        NOT NULL,
    weight          INT         NOT NULL DEFAULT 3 CHECK (weight BETWEEN 1 AND 5),
    frequency_kind  TEXT        NOT NULL CHECK (frequency_kind IN ('daily','weekdays','specific_days','weekly')),
    days_of_week    TEXT[]      NOT NULL DEFAULT '{}',
    auto_approve    BOOLEAN     NOT NULL DEFAULT TRUE,
    archived_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_chores_household ON chores (household_id) WHERE archived_at IS NULL;
CREATE INDEX idx_chores_member ON chores (member_id) WHERE archived_at IS NULL;
-- +goose StatementEnd

-- +goose StatementBegin
CREATE TABLE chore_completions (
    id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    chore_id                 UUID        NOT NULL REFERENCES chores(id) ON DELETE CASCADE,
    member_id                UUID        NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    date                     DATE        NOT NULL,
    marked_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    approved                 BOOLEAN     NOT NULL DEFAULT TRUE,
    approved_by_account_id   UUID        REFERENCES accounts(id) ON DELETE SET NULL,
    payout_cents             INT         NOT NULL DEFAULT 0,
    closed                   BOOLEAN     NOT NULL DEFAULT FALSE
);
CREATE UNIQUE INDEX uq_chore_completions ON chore_completions (chore_id, date);
CREATE INDEX idx_completions_member_date ON chore_completions (member_id, date DESC);
-- +goose StatementEnd

-- +goose StatementBegin
CREATE TABLE wallets (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id     UUID        NOT NULL UNIQUE REFERENCES members(id) ON DELETE CASCADE,
    balance_cents BIGINT      NOT NULL DEFAULT 0,
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- +goose StatementEnd

-- +goose StatementBegin
CREATE TABLE wallet_transactions (
    id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id               UUID        NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    member_id               UUID        NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    amount_cents            BIGINT      NOT NULL,
    kind                    TEXT        NOT NULL CHECK (kind IN ('chore_payout','streak_bonus','tip','ad_hoc','cash_out','adjustment')),
    reference_id            UUID,
    reason                  TEXT        NOT NULL DEFAULT '',
    created_by_account_id   UUID        REFERENCES accounts(id) ON DELETE SET NULL,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_wallet_tx_wallet ON wallet_transactions (wallet_id, created_at DESC);
CREATE INDEX idx_wallet_tx_member ON wallet_transactions (member_id, created_at DESC);
-- +goose StatementEnd

-- +goose StatementBegin
CREATE TABLE allowance_settings (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id  UUID        NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    member_id     UUID        NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    amount_cents  BIGINT      NOT NULL DEFAULT 0 CHECK (amount_cents >= 0),
    active_from   DATE        NOT NULL DEFAULT CURRENT_DATE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_allowance_member_active ON allowance_settings (member_id, active_from DESC);
-- +goose StatementEnd

-- +goose StatementBegin
CREATE TABLE ad_hoc_tasks (
    id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id             UUID        NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    member_id                UUID        NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    name                     TEXT        NOT NULL,
    payout_cents             INT         NOT NULL CHECK (payout_cents >= 0),
    requires_approval        BOOLEAN     NOT NULL DEFAULT TRUE,
    status                   TEXT        NOT NULL DEFAULT 'open' CHECK (status IN ('open','pending','approved','declined')),
    created_by_account_id    UUID        REFERENCES accounts(id) ON DELETE SET NULL,
    completed_at             TIMESTAMPTZ,
    approved_at              TIMESTAMPTZ,
    approved_by_account_id   UUID        REFERENCES accounts(id) ON DELETE SET NULL,
    decline_reason           TEXT        NOT NULL DEFAULT '',
    expires_at               TIMESTAMPTZ,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_ad_hoc_member_status ON ad_hoc_tasks (member_id, status);
-- +goose StatementEnd

-- +goose StatementBegin
CREATE TABLE weekly_summaries (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id        UUID        NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    member_id           UUID        NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    week_start          DATE        NOT NULL,
    earned_cents        BIGINT      NOT NULL DEFAULT 0,
    streak_bonus_cents  BIGINT      NOT NULL DEFAULT 0,
    chores_completed    INT         NOT NULL DEFAULT 0,
    chores_possible     INT         NOT NULL DEFAULT 0,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX uq_weekly_summary ON weekly_summaries (member_id, week_start);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS weekly_summaries;
DROP TABLE IF EXISTS ad_hoc_tasks;
DROP TABLE IF EXISTS allowance_settings;
DROP TABLE IF EXISTS wallet_transactions;
DROP TABLE IF EXISTS wallets;
DROP TABLE IF EXISTS chore_completions;
DROP TABLE IF EXISTS chores;
-- +goose StatementEnd

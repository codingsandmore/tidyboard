-- +goose Up
-- +goose StatementBegin
CREATE TABLE point_categories (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id  UUID        NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    name          TEXT        NOT NULL,
    color         TEXT        NOT NULL DEFAULT '#6b7280',
    sort_order    INT         NOT NULL DEFAULT 0,
    archived_at   TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_point_categories_household ON point_categories (household_id) WHERE archived_at IS NULL;
-- +goose StatementEnd

-- +goose StatementBegin
CREATE TABLE behaviors (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id      UUID        NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    category_id       UUID        NOT NULL REFERENCES point_categories(id) ON DELETE CASCADE,
    name              TEXT        NOT NULL,
    suggested_points  INT         NOT NULL DEFAULT 1,
    archived_at       TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_behaviors_household ON behaviors (household_id) WHERE archived_at IS NULL;
CREATE INDEX idx_behaviors_category ON behaviors (category_id) WHERE archived_at IS NULL;
-- +goose StatementEnd

-- +goose StatementBegin
CREATE TABLE point_grants (
    id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id             UUID        NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    member_id                UUID        NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    category_id              UUID        REFERENCES point_categories(id) ON DELETE SET NULL,
    behavior_id              UUID        REFERENCES behaviors(id) ON DELETE SET NULL,
    points                   INT         NOT NULL,
    reason                   TEXT        NOT NULL DEFAULT '',
    granted_by_account_id    UUID        REFERENCES accounts(id) ON DELETE SET NULL,
    granted_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_point_grants_member ON point_grants (member_id, granted_at DESC);
CREATE INDEX idx_point_grants_household ON point_grants (household_id, granted_at DESC);
CREATE INDEX idx_point_grants_category ON point_grants (category_id, granted_at DESC);
-- +goose StatementEnd

-- +goose StatementBegin
CREATE TABLE rewards (
    id                     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id           UUID        NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    name                   TEXT        NOT NULL,
    description            TEXT        NOT NULL DEFAULT '',
    image_url              TEXT,
    cost_points            INT         NOT NULL CHECK (cost_points >= 0),
    fulfillment_kind       TEXT        NOT NULL DEFAULT 'needs_approval' CHECK (fulfillment_kind IN ('self_serve','needs_approval')),
    active                 BOOLEAN     NOT NULL DEFAULT TRUE,
    created_by_account_id  UUID        REFERENCES accounts(id) ON DELETE SET NULL,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_rewards_household ON rewards (household_id) WHERE active = TRUE;
-- +goose StatementEnd

-- +goose StatementBegin
CREATE TABLE redemptions (
    id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id             UUID        NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    reward_id                UUID        NOT NULL REFERENCES rewards(id) ON DELETE CASCADE,
    member_id                UUID        NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    points_at_redemption     INT         NOT NULL,
    status                   TEXT        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','fulfilled','declined')),
    requested_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    decided_at               TIMESTAMPTZ,
    decided_by_account_id    UUID        REFERENCES accounts(id) ON DELETE SET NULL,
    fulfilled_at             TIMESTAMPTZ,
    decline_reason           TEXT        NOT NULL DEFAULT '',
    grant_id                 UUID        REFERENCES point_grants(id) ON DELETE SET NULL
);
CREATE INDEX idx_redemptions_member ON redemptions (member_id, requested_at DESC);
CREATE INDEX idx_redemptions_household_status ON redemptions (household_id, status);
-- +goose StatementEnd

-- +goose StatementBegin
CREATE TABLE savings_goals (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id    UUID        NOT NULL UNIQUE REFERENCES members(id) ON DELETE CASCADE,
    reward_id    UUID        NOT NULL REFERENCES rewards(id) ON DELETE CASCADE,
    started_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    cleared_at   TIMESTAMPTZ
);
-- +goose StatementEnd

-- +goose StatementBegin
CREATE TABLE reward_cost_adjustments (
    id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id             UUID        NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    member_id                UUID        NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    reward_id                UUID        NOT NULL REFERENCES rewards(id) ON DELETE CASCADE,
    delta_points             INT         NOT NULL,
    reason                   TEXT        NOT NULL DEFAULT '',
    expires_at               TIMESTAMPTZ,
    created_by_account_id    UUID        REFERENCES accounts(id) ON DELETE SET NULL,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_reward_adj_member_reward ON reward_cost_adjustments (member_id, reward_id);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS reward_cost_adjustments;
DROP TABLE IF EXISTS savings_goals;
DROP TABLE IF EXISTS redemptions;
DROP TABLE IF EXISTS rewards;
DROP TABLE IF EXISTS point_grants;
DROP TABLE IF EXISTS behaviors;
DROP TABLE IF EXISTS point_categories;
-- +goose StatementEnd

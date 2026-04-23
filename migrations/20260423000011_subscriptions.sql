-- +goose Up
-- +goose StatementBegin

CREATE TABLE subscriptions (
    id                     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id           UUID        NOT NULL UNIQUE REFERENCES households(id) ON DELETE CASCADE,
    stripe_customer_id     TEXT        NOT NULL DEFAULT '',
    stripe_subscription_id TEXT        NOT NULL DEFAULT '',
    status                 TEXT        NOT NULL DEFAULT 'incomplete'
                               CHECK (status IN ('active','trialing','past_due','canceled','incomplete')),
    current_period_end     TIMESTAMPTZ,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_household_id      ON subscriptions (household_id);
CREATE INDEX idx_subscriptions_stripe_customer_id ON subscriptions (stripe_customer_id);

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS subscriptions;
-- +goose StatementEnd

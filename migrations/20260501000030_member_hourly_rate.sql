-- +goose Up
-- +goose StatementBegin

-- Per docs/specs/2026-05-01-fairplay-design.md Section G:
-- Add private hourly-rate range to members. The values are PRIVATE — read &
-- write access is gated to the rate-owner themselves OR a household admin
-- (role='owner' OR 'admin'). Audit log entries MUST NOT include the values.
ALTER TABLE members
    ADD COLUMN hourly_rate_cents_min INTEGER,
    ADD COLUMN hourly_rate_cents_max INTEGER,
    ADD CONSTRAINT members_hourly_rate_nonnegative
        CHECK (
            (hourly_rate_cents_min IS NULL OR hourly_rate_cents_min >= 0) AND
            (hourly_rate_cents_max IS NULL OR hourly_rate_cents_max >= 0)
        ),
    ADD CONSTRAINT members_hourly_rate_min_le_max
        CHECK (
            hourly_rate_cents_min IS NULL
            OR hourly_rate_cents_max IS NULL
            OR hourly_rate_cents_min <= hourly_rate_cents_max
        );

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE members
    DROP CONSTRAINT IF EXISTS members_hourly_rate_min_le_max,
    DROP CONSTRAINT IF EXISTS members_hourly_rate_nonnegative,
    DROP COLUMN IF EXISTS hourly_rate_cents_max,
    DROP COLUMN IF EXISTS hourly_rate_cents_min;
-- +goose StatementEnd

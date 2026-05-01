-- +goose Up
-- +goose StatementBegin

-- Issue #110, section B.2.e: shopping list must scale ingredient quantities
-- by the meal-plan entry's serving_multiplier × batch_quantity.
--
-- Add the multiplier columns. Both default to 1 so existing rows behave
-- as if the multiplier feature was always present (no behaviour change for
-- the common case of a single, unsized planned meal).

ALTER TABLE meal_plan_entries
    ADD COLUMN IF NOT EXISTS serving_multiplier NUMERIC NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS batch_quantity     NUMERIC NOT NULL DEFAULT 1;

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

ALTER TABLE meal_plan_entries
    DROP COLUMN IF EXISTS batch_quantity,
    DROP COLUMN IF EXISTS serving_multiplier;

-- +goose StatementEnd

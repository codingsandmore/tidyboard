-- +goose Up
-- +goose StatementBegin

CREATE TABLE meal_plan_entries (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID        NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    recipe_id    UUID        REFERENCES recipes(id) ON DELETE SET NULL,
    date         DATE        NOT NULL,
    slot         TEXT        NOT NULL CHECK (slot IN ('breakfast','lunch','dinner','snack')),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (household_id, date, slot)
);

CREATE INDEX idx_meal_plan_entries_household_date ON meal_plan_entries (household_id, date);

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS meal_plan_entries;
-- +goose StatementEnd

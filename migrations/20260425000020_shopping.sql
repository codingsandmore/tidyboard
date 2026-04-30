-- +goose Up
-- +goose StatementBegin

-- Shopping lists (auto-generated from meal plan or manual)
CREATE TABLE shopping_lists (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID        NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    name         TEXT        NOT NULL DEFAULT '',
    date_from    DATE        NOT NULL,
    date_to      DATE        NOT NULL,
    is_active    BOOLEAN     NOT NULL DEFAULT true,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_shopping_lists_household    ON shopping_lists (household_id);
CREATE INDEX idx_shopping_lists_active       ON shopping_lists (household_id) WHERE is_active = true;

-- Items on a shopping list
CREATE TABLE shopping_list_items (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    shopping_list_id UUID        NOT NULL REFERENCES shopping_lists(id) ON DELETE CASCADE,
    household_id     UUID        NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    name             TEXT        NOT NULL,
    amount           NUMERIC     NOT NULL DEFAULT 0,
    unit             TEXT        NOT NULL DEFAULT '',
    aisle            TEXT        NOT NULL DEFAULT '',
    source_recipes   TEXT[]      NOT NULL DEFAULT '{}', -- recipe titles for provenance
    completed        BOOLEAN     NOT NULL DEFAULT false,
    sort_order       INTEGER     NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_shopping_list_items_list      ON shopping_list_items (shopping_list_id);
CREATE INDEX idx_shopping_list_items_household ON shopping_list_items (household_id);

-- Pantry staples: items always added to every generated shopping list
CREATE TABLE pantry_staples (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID        NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    name         TEXT        NOT NULL,
    amount       NUMERIC     NOT NULL DEFAULT 0,
    unit         TEXT        NOT NULL DEFAULT '',
    aisle        TEXT        NOT NULL DEFAULT '',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (household_id, name)
);

CREATE INDEX idx_pantry_staples_household ON pantry_staples (household_id);

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS pantry_staples;
DROP TABLE IF EXISTS shopping_list_items;
DROP TABLE IF EXISTS shopping_lists;
-- +goose StatementEnd

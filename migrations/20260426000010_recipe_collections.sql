-- +goose Up
-- +goose StatementBegin

CREATE TABLE recipe_collections (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID        NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    name         TEXT        NOT NULL,
    slug         TEXT        NOT NULL DEFAULT '',
    sort_order   INTEGER     NOT NULL DEFAULT 0,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (household_id, slug)
);

CREATE INDEX idx_recipe_collections_household ON recipe_collections (household_id);

CREATE TABLE recipe_collection_items (
    collection_id UUID    NOT NULL REFERENCES recipe_collections(id) ON DELETE CASCADE,
    recipe_id     UUID    NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    sort_order    INTEGER NOT NULL DEFAULT 0,
    added_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (collection_id, recipe_id)
);

CREATE INDEX idx_recipe_collection_items_collection ON recipe_collection_items (collection_id);
CREATE INDEX idx_recipe_collection_items_recipe     ON recipe_collection_items (recipe_id);

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS recipe_collection_items;
DROP TABLE IF EXISTS recipe_collections;
-- +goose StatementEnd

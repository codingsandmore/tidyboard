-- +goose Up
-- +goose StatementBegin

CREATE TABLE recipes (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id   UUID        NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    title          TEXT        NOT NULL,
    description    TEXT        NOT NULL DEFAULT '',
    source_url     TEXT        NOT NULL DEFAULT '',
    source_domain  TEXT        NOT NULL DEFAULT '',
    image_url      TEXT        NOT NULL DEFAULT '',
    prep_time      TEXT        NOT NULL DEFAULT '',  -- ISO 8601 duration e.g. PT15M
    cook_time      TEXT        NOT NULL DEFAULT '',
    total_time     TEXT        NOT NULL DEFAULT '',
    servings       INTEGER     NOT NULL DEFAULT 0,
    servings_unit  TEXT        NOT NULL DEFAULT 'servings',
    categories     TEXT[]      NOT NULL DEFAULT '{}',
    cuisine        TEXT        NOT NULL DEFAULT '',
    tags           TEXT[]      NOT NULL DEFAULT '{}',
    difficulty     TEXT        NOT NULL DEFAULT 'easy'
                               CHECK (difficulty IN ('easy','medium','hard')),
    rating         INTEGER     NOT NULL DEFAULT 0
                               CHECK (rating BETWEEN 0 AND 5),
    notes          TEXT        NOT NULL DEFAULT '',
    is_favorite    BOOLEAN     NOT NULL DEFAULT false,
    times_cooked   INTEGER     NOT NULL DEFAULT 0,
    last_cooked_at DATE,
    created_by     UUID        NOT NULL REFERENCES members(id) ON DELETE RESTRICT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_recipes_household   ON recipes (household_id);
CREATE INDEX idx_recipes_favorite    ON recipes (household_id) WHERE is_favorite = true;
CREATE INDEX idx_recipes_source_url  ON recipes (household_id, source_url) WHERE source_url != '';
CREATE INDEX idx_recipes_search      ON recipes USING GIN (to_tsvector('english', title || ' ' || notes));

CREATE TABLE recipe_ingredients (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    recipe_id         UUID        NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    household_id      UUID        NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    sort_order        INTEGER     NOT NULL DEFAULT 0,
    group_name        TEXT        NOT NULL DEFAULT '',
    amount            NUMERIC     NOT NULL DEFAULT 0,
    unit              TEXT        NOT NULL DEFAULT '',
    name              TEXT        NOT NULL,
    preparation       TEXT        NOT NULL DEFAULT '',
    optional          BOOLEAN     NOT NULL DEFAULT false,
    substitution_note TEXT        NOT NULL DEFAULT ''
);

CREATE INDEX idx_recipe_ingredients_recipe ON recipe_ingredients (recipe_id);

CREATE TABLE recipe_steps (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    recipe_id     UUID        NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    household_id  UUID        NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    sort_order    INTEGER     NOT NULL DEFAULT 0,
    text          TEXT        NOT NULL,
    timer_seconds INTEGER,
    image_url     TEXT        NOT NULL DEFAULT ''
);

CREATE INDEX idx_recipe_steps_recipe ON recipe_steps (recipe_id);

CREATE TABLE ingredient_canonical (
    id               UUID     PRIMARY KEY DEFAULT gen_random_uuid(),
    name             TEXT     NOT NULL UNIQUE,
    aliases          TEXT[]   NOT NULL DEFAULT '{}',
    category         TEXT     NOT NULL DEFAULT '',
    default_unit     TEXT     NOT NULL DEFAULT '',
    unit_conversions JSONB    NOT NULL DEFAULT '{}'
);

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS ingredient_canonical;
DROP TABLE IF EXISTS recipe_steps;
DROP TABLE IF EXISTS recipe_ingredients;
DROP TABLE IF EXISTS recipes;
-- +goose StatementEnd

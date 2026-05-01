-- +goose Up
-- +goose StatementBegin

-- Tracks the lifecycle of a recipe URL-import job so the web UI can poll for
-- progress instead of holding an HTTP connection open for the duration of
-- the scrape. Issue #108.
CREATE TABLE recipe_import_jobs (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id  UUID        NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    member_id     UUID        NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    url           TEXT        NOT NULL,
    status        TEXT        NOT NULL DEFAULT 'running'
                              CHECK (status IN ('running','succeeded','failed')),
    error_message TEXT        NOT NULL DEFAULT '',
    recipe_id     UUID        REFERENCES recipes(id) ON DELETE SET NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_recipe_import_jobs_household ON recipe_import_jobs (household_id, created_at DESC);

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS recipe_import_jobs;
-- +goose StatementEnd

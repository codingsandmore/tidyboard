-- +goose Up
-- +goose StatementBegin
ALTER TABLE chores
    ADD COLUMN IF NOT EXISTS category TEXT;

CREATE INDEX IF NOT EXISTS idx_chores_category
    ON chores (household_id, category)
    WHERE archived_at IS NULL AND category IS NOT NULL;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP INDEX IF EXISTS idx_chores_category;
ALTER TABLE chores DROP COLUMN IF EXISTS category;
-- +goose StatementEnd

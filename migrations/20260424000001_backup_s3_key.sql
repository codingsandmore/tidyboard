-- +goose Up
-- +goose StatementBegin

ALTER TABLE backup_records
    ADD COLUMN IF NOT EXISTS s3_key TEXT;

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

ALTER TABLE backup_records
    DROP COLUMN IF EXISTS s3_key;

-- +goose StatementEnd

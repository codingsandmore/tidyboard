-- +goose Up
-- +goose StatementBegin

-- Add CalDAV credential columns to the calendars table.
-- password_encrypted is a placeholder field; actual encryption is TODO.
ALTER TABLE calendars
    ADD COLUMN IF NOT EXISTS url                TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS username           TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS password_encrypted TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS display_name       TEXT NOT NULL DEFAULT '';

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

ALTER TABLE calendars
    DROP COLUMN IF EXISTS url,
    DROP COLUMN IF EXISTS username,
    DROP COLUMN IF EXISTS password_encrypted,
    DROP COLUMN IF EXISTS display_name;

-- +goose StatementEnd

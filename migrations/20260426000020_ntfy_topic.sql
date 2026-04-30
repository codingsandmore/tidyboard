-- +goose Up
-- +goose StatementBegin

-- Add ntfy_topic to members so each member can have their own ntfy.sh topic.
-- notification_preferences JSONB already exists (from init_members migration).
ALTER TABLE members ADD COLUMN IF NOT EXISTS ntfy_topic TEXT;

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE members DROP COLUMN IF EXISTS ntfy_topic;
-- +goose StatementEnd

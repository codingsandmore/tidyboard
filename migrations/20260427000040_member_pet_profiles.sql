-- +goose Up
-- +goose StatementBegin

ALTER TABLE members DROP CONSTRAINT IF EXISTS members_role_check;
ALTER TABLE members
    ADD CONSTRAINT members_role_check
    CHECK (role IN ('owner','admin','member','child','guest','pet'));

ALTER TABLE members DROP CONSTRAINT IF EXISTS members_age_group_check;
ALTER TABLE members
    ADD CONSTRAINT members_age_group_check
    CHECK (age_group IN ('toddler','child','tween','teen','adult','pet'));

ALTER TABLE members
    ADD CONSTRAINT members_pet_no_credentials_check
    CHECK (role <> 'pet' OR (account_id IS NULL AND pin_hash IS NULL AND age_group = 'pet'));

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

ALTER TABLE members DROP CONSTRAINT IF EXISTS members_pet_no_credentials_check;
ALTER TABLE members DROP CONSTRAINT IF EXISTS members_role_check;
ALTER TABLE members
    ADD CONSTRAINT members_role_check
    CHECK (role IN ('owner','admin','member','child','guest'));

ALTER TABLE members DROP CONSTRAINT IF EXISTS members_age_group_check;
ALTER TABLE members
    ADD CONSTRAINT members_age_group_check
    CHECK (age_group IN ('toddler','child','tween','teen','adult'));

-- +goose StatementEnd

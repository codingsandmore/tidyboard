-- +goose Up
-- +goose StatementBegin
CREATE TABLE chore_pets (
    chore_id   UUID NOT NULL REFERENCES chores(id)  ON DELETE CASCADE,
    pet_id     UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (chore_id, pet_id)
);
CREATE INDEX idx_chore_pets_pet ON chore_pets (pet_id);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS chore_pets;
-- +goose StatementEnd

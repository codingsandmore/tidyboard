-- sql/queries/chore_pets.sql
-- chore_pets join table queries: links chores to pet members.
-- Section D of docs/specs/2026-05-01-fairplay-design.md.

-- name: AddChorePet :exec
INSERT INTO chore_pets (chore_id, pet_id)
VALUES ($1, $2)
ON CONFLICT (chore_id, pet_id) DO NOTHING;

-- name: RemoveChorePet :exec
DELETE FROM chore_pets
WHERE chore_id = $1 AND pet_id = $2;

-- name: ListChorePets :many
SELECT pet_id FROM chore_pets
WHERE chore_id = $1
ORDER BY created_at ASC;

-- name: ClearChorePets :exec
DELETE FROM chore_pets WHERE chore_id = $1;

-- name: ListPetMembersForHousehold :many
SELECT id FROM members
WHERE household_id = $1 AND role = 'pet';

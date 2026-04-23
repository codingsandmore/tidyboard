-- sql/queries/backup.sql
-- Backup record queries. Run `sqlc generate` to produce Go code in internal/query/.

-- name: InsertBackupRecord :one
INSERT INTO backup_records (
    id,
    type,
    destination,
    file_path,
    size_bytes,
    checksum_sha256,
    schema_version,
    status
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8
)
RETURNING *;

-- name: UpdateBackupRecord :one
UPDATE backup_records
SET
    size_bytes      = COALESCE(sqlc.narg(size_bytes), size_bytes),
    checksum_sha256 = COALESCE(sqlc.narg(checksum_sha256), checksum_sha256),
    status          = COALESCE(sqlc.narg(status), status)
WHERE id = $1
RETURNING *;

-- name: ListBackupRecords :many
SELECT * FROM backup_records
ORDER BY created_at DESC
LIMIT $1 OFFSET $2;

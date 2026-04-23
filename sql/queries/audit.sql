-- sql/queries/audit.sql
-- Audit log queries. Run `sqlc generate` to produce Go code in internal/query/.

-- name: InsertAuditEntry :exec
INSERT INTO audit_entries (
    id,
    household_id,
    actor_member_id,
    actor_account_id,
    action,
    entity_type,
    entity_id,
    details,
    device_info,
    ip_address
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
);

-- name: ListHouseholdAudit :many
SELECT * FROM audit_entries
WHERE household_id = $1
ORDER BY timestamp DESC
LIMIT $2 OFFSET $3;

-- name: ListAccountAudit :many
SELECT * FROM audit_entries
WHERE actor_account_id = $1
ORDER BY timestamp DESC
LIMIT $2 OFFSET $3;

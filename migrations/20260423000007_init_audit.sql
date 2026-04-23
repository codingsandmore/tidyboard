-- +goose Up
-- +goose StatementBegin

-- AuditEntry is not household-scoped in the FK sense but stores household_id for querying.
CREATE TABLE audit_entries (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    household_id     UUID        NOT NULL,   -- intentionally no FK: audit survives household deletion
    actor_member_id  UUID,
    actor_account_id UUID,
    action           TEXT        NOT NULL,
    entity_type      TEXT        NOT NULL,
    entity_id        UUID        NOT NULL,
    details          JSONB       NOT NULL DEFAULT '{}',
    device_info      TEXT        NOT NULL DEFAULT '',
    ip_address       TEXT
);

CREATE INDEX idx_audit_household  ON audit_entries (household_id, timestamp DESC);
CREATE INDEX idx_audit_entity     ON audit_entries (entity_type, entity_id);
CREATE INDEX idx_audit_actor      ON audit_entries (actor_account_id) WHERE actor_account_id IS NOT NULL;

-- BackupRecord is global (not household-scoped).
CREATE TABLE backup_records (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    type             TEXT        NOT NULL DEFAULT 'manual'
                                 CHECK (type IN ('scheduled','manual','pre_restore')),
    destination      TEXT        NOT NULL,
    file_path        TEXT        NOT NULL,
    size_bytes       BIGINT      NOT NULL DEFAULT 0,
    checksum_sha256  TEXT        NOT NULL DEFAULT '',
    schema_version   TEXT        NOT NULL DEFAULT '',
    status           TEXT        NOT NULL DEFAULT 'in_progress'
                                 CHECK (status IN ('completed','failed','in_progress'))
);

CREATE INDEX idx_backup_records_created ON backup_records (created_at DESC);

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS backup_records;
DROP TABLE IF EXISTS audit_entries;
-- +goose StatementEnd

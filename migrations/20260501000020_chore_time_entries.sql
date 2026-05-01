-- +goose Up
-- +goose StatementBegin
CREATE TABLE chore_time_entries (
    id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    chore_id         UUID         NOT NULL REFERENCES chores(id) ON DELETE CASCADE,
    member_id        UUID         NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    started_at       TIMESTAMPTZ  NOT NULL,
    ended_at         TIMESTAMPTZ,
    duration_seconds INT          GENERATED ALWAYS AS (
                                      CASE
                                          WHEN ended_at IS NULL THEN NULL
                                          ELSE GREATEST(0, EXTRACT(EPOCH FROM (ended_at - started_at)))::INT
                                      END
                                  ) STORED,
    note             TEXT         NOT NULL DEFAULT '',
    source           TEXT         NOT NULL DEFAULT 'timer'
                                  CHECK (source IN ('timer','manual')),
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_chore_time_entries_chore_member
    ON chore_time_entries (chore_id, member_id, started_at DESC);

CREATE INDEX idx_chore_time_entries_member_started
    ON chore_time_entries (member_id, started_at DESC);

-- At most one open entry per (chore, member). Enforced via partial unique index
-- so closed entries (ended_at IS NOT NULL) don't collide.
CREATE UNIQUE INDEX uq_chore_time_entries_open
    ON chore_time_entries (chore_id, member_id)
    WHERE ended_at IS NULL;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS chore_time_entries;
-- +goose StatementEnd

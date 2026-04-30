-- +goose Up
-- +goose StatementBegin

-- Task domains — broad categories of household work
CREATE TABLE task_domains (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID        NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    name         TEXT        NOT NULL,
    icon         TEXT        NOT NULL DEFAULT '',
    description  TEXT        NOT NULL DEFAULT '',
    is_system    BOOLEAN     NOT NULL DEFAULT false,
    sort_order   INTEGER     NOT NULL DEFAULT 0,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (household_id, name)
);

CREATE INDEX idx_task_domains_household ON task_domains (household_id);

-- Domain ownership — exactly one owner per domain at any time
CREATE TABLE domain_ownerships (
    id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id          UUID        NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    domain_id             UUID        NOT NULL REFERENCES task_domains(id) ON DELETE CASCADE,
    owner_member_id       UUID        NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    assigned_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    assigned_by_member_id UUID        REFERENCES members(id) ON DELETE SET NULL,
    notes                 TEXT        NOT NULL DEFAULT '',
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (domain_id)  -- only one active ownership record per domain
);

CREATE INDEX idx_domain_ownerships_household ON domain_ownerships (household_id);
CREATE INDEX idx_domain_ownerships_member    ON domain_ownerships (owner_member_id);

-- Equity tasks — recurring household responsibilities
CREATE TABLE equity_tasks (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id    UUID        NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    domain_id       UUID        NOT NULL REFERENCES task_domains(id) ON DELETE CASCADE,
    name            TEXT        NOT NULL,
    task_type       TEXT        NOT NULL DEFAULT 'both' CHECK (task_type IN ('cognitive', 'physical', 'both')),
    recurrence      TEXT        NOT NULL DEFAULT '',   -- e.g. "daily", "weekly", "monthly", cron expr
    est_minutes     INTEGER     NOT NULL DEFAULT 0,
    owner_member_id UUID        REFERENCES members(id) ON DELETE SET NULL,
    share_pct       INTEGER     NOT NULL DEFAULT 100 CHECK (share_pct BETWEEN 0 AND 100),
    archived        BOOLEAN     NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_equity_tasks_household ON equity_tasks (household_id);
CREATE INDEX idx_equity_tasks_domain    ON equity_tasks (domain_id);
CREATE INDEX idx_equity_tasks_owner     ON equity_tasks (owner_member_id);
CREATE INDEX idx_equity_tasks_active    ON equity_tasks (household_id) WHERE archived = false;

-- Task logs — time tracking per task per member
CREATE TABLE task_logs (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id          UUID        NOT NULL REFERENCES equity_tasks(id) ON DELETE CASCADE,
    household_id     UUID        NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    member_id        UUID        NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    started_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    duration_minutes INTEGER     NOT NULL DEFAULT 0 CHECK (duration_minutes >= 0),
    is_cognitive     BOOLEAN     NOT NULL DEFAULT false,
    notes            TEXT        NOT NULL DEFAULT '',
    source           TEXT        NOT NULL DEFAULT 'manual' CHECK (source IN ('timer', 'manual', 'auto_estimate')),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_task_logs_task      ON task_logs (task_id);
CREATE INDEX idx_task_logs_household ON task_logs (household_id);
CREATE INDEX idx_task_logs_member    ON task_logs (member_id);
CREATE INDEX idx_task_logs_started   ON task_logs (household_id, started_at);

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS task_logs;
DROP TABLE IF EXISTS equity_tasks;
DROP TABLE IF EXISTS domain_ownerships;
DROP TABLE IF EXISTS task_domains;
-- +goose StatementEnd

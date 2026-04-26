-- +goose Up
-- +goose StatementBegin

CREATE TABLE routines (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id  UUID        NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    name          TEXT        NOT NULL,
    member_id     UUID        REFERENCES members(id) ON DELETE SET NULL,
    days_of_week  TEXT[]      NOT NULL DEFAULT '{}',
    time_slot     TEXT        NOT NULL DEFAULT 'anytime' CHECK (time_slot IN ('morning','evening','anytime')),
    archived      BOOLEAN     NOT NULL DEFAULT FALSE,
    sort_order    INT         NOT NULL DEFAULT 0,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE routine_steps (
    id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    routine_id  UUID    NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
    name        TEXT    NOT NULL,
    est_minutes INT,
    sort_order  INT     NOT NULL DEFAULT 0,
    icon        TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE routine_completions (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    routine_id   UUID        NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
    step_id      UUID        REFERENCES routine_steps(id) ON DELETE CASCADE,
    member_id    UUID        NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique completion per (routine, step, member, calendar-date).
-- completed_at::DATE is not immutable (timezone-dependent), so we use
-- (completed_at AT TIME ZONE 'UTC')::DATE which Postgres marks immutable.
CREATE UNIQUE INDEX uq_routine_completion_step
    ON routine_completions (routine_id, step_id, member_id, (completed_at AT TIME ZONE 'UTC')::DATE)
    WHERE step_id IS NOT NULL;

CREATE UNIQUE INDEX uq_routine_completion_whole
    ON routine_completions (routine_id, member_id, (completed_at AT TIME ZONE 'UTC')::DATE)
    WHERE step_id IS NULL;

CREATE INDEX idx_routines_household ON routines(household_id);
CREATE INDEX idx_routines_member    ON routines(member_id);
CREATE INDEX idx_routine_steps_routine ON routine_steps(routine_id);
CREATE INDEX idx_routine_completions_routine_member ON routine_completions(routine_id, member_id);
CREATE INDEX idx_routine_completions_date ON routine_completions(((completed_at AT TIME ZONE 'UTC')::DATE));

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS routine_completions;
DROP TABLE IF EXISTS routine_steps;
DROP TABLE IF EXISTS routines;
-- +goose StatementEnd

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
-- +goose StatementEnd

-- +goose StatementBegin
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
-- +goose StatementEnd

-- +goose StatementBegin
CREATE TABLE routine_completions (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    routine_id   UUID        NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
    step_id      UUID        REFERENCES routine_steps(id) ON DELETE CASCADE,
    member_id    UUID        NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- +goose StatementEnd

-- +goose StatementBegin
CREATE UNIQUE INDEX uq_routine_completion_step
    ON routine_completions (routine_id, step_id, member_id, CAST(timezone('utc', completed_at) AS date))
    WHERE step_id IS NOT NULL;
-- +goose StatementEnd

-- +goose StatementBegin
CREATE UNIQUE INDEX uq_routine_completion_whole
    ON routine_completions (routine_id, member_id, CAST(timezone('utc', completed_at) AS date))
    WHERE step_id IS NULL;
-- +goose StatementEnd

-- +goose StatementBegin
CREATE INDEX idx_routines_household ON routines(household_id);
-- +goose StatementEnd

-- +goose StatementBegin
CREATE INDEX idx_routines_member ON routines(member_id);
-- +goose StatementEnd

-- +goose StatementBegin
CREATE INDEX idx_routine_steps_routine ON routine_steps(routine_id);
-- +goose StatementEnd

-- +goose StatementBegin
CREATE INDEX idx_routine_completions_routine_member ON routine_completions(routine_id, member_id);
-- +goose StatementEnd

-- +goose StatementBegin
CREATE INDEX idx_routine_completions_date ON routine_completions(CAST(timezone('utc', completed_at) AS date));
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS routine_completions;
-- +goose StatementEnd

-- +goose StatementBegin
DROP TABLE IF EXISTS routine_steps;
-- +goose StatementEnd

-- +goose StatementBegin
DROP TABLE IF EXISTS routines;
-- +goose StatementEnd

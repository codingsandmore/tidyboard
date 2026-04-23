-- +goose Up
-- +goose StatementBegin

CREATE TABLE calendars (
    id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id       UUID        NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    name               TEXT        NOT NULL,
    source             TEXT        NOT NULL DEFAULT 'local'
                                   CHECK (source IN ('local','google','outlook','ical_url','caldav')),
    sync_config        JSONB       NOT NULL DEFAULT '{}',
    sync_direction     TEXT        NOT NULL DEFAULT 'one_way_in'
                                   CHECK (sync_direction IN ('one_way_in','one_way_out','two_way')),
    assigned_member_id UUID        REFERENCES members(id) ON DELETE SET NULL,
    color_override     TEXT,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_calendars_household ON calendars (household_id);

CREATE TABLE events (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id     UUID        NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    calendar_id      UUID        REFERENCES calendars(id) ON DELETE SET NULL,
    external_id      TEXT,
    title            TEXT        NOT NULL,
    description      TEXT        NOT NULL DEFAULT '',
    start_time       TIMESTAMPTZ NOT NULL,
    end_time         TIMESTAMPTZ NOT NULL,
    all_day          BOOLEAN     NOT NULL DEFAULT false,
    location         TEXT        NOT NULL DEFAULT '',
    recurrence_rule  TEXT        NOT NULL DEFAULT '',
    assigned_members UUID[]      NOT NULL DEFAULT '{}',
    reminders        JSONB       NOT NULL DEFAULT '[]',
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT events_end_after_start CHECK (end_time >= start_time)
);

CREATE INDEX idx_events_household   ON events (household_id);
CREATE INDEX idx_events_time_range  ON events (household_id, start_time, end_time);
CREATE INDEX idx_events_calendar    ON events (calendar_id) WHERE calendar_id IS NOT NULL;
CREATE UNIQUE INDEX idx_events_external ON events (household_id, external_id)
    WHERE external_id IS NOT NULL;

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS events;
DROP TABLE IF EXISTS calendars;
-- +goose StatementEnd

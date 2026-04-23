-- +goose Up
-- +goose StatementBegin

CREATE TABLE lists (
    id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id       UUID        NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    name               TEXT        NOT NULL,
    type               TEXT        NOT NULL DEFAULT 'todo'
                                   CHECK (type IN ('todo','grocery','packing','custom')),
    shared             BOOLEAN     NOT NULL DEFAULT true,
    assigned_member_id UUID        REFERENCES members(id) ON DELETE SET NULL,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_lists_household ON lists (household_id);

CREATE TABLE list_items (
    id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    list_id            UUID        NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
    household_id       UUID        NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    text               TEXT        NOT NULL,
    completed          BOOLEAN     NOT NULL DEFAULT false,
    assigned_member_id UUID        REFERENCES members(id) ON DELETE SET NULL,
    due_date           DATE,
    priority           TEXT        NOT NULL DEFAULT 'none'
                                   CHECK (priority IN ('none','low','medium','high')),
    sort_order         INTEGER     NOT NULL DEFAULT 0,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_list_items_list      ON list_items (list_id);
CREATE INDEX idx_list_items_household ON list_items (household_id);
CREATE INDEX idx_list_items_order     ON list_items (list_id, sort_order);

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS list_items;
DROP TABLE IF EXISTS lists;
-- +goose StatementEnd

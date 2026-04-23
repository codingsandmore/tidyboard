-- Smith family sample data for Tidyboard
-- Generated from web/src/lib/data.ts
-- Run via: make seed
-- Or directly: psql -U tidyboard -d tidyboard -f sql/seed/smith_family.sql

BEGIN;

-- ── Household ──────────────────────────────────────────────────────────────

INSERT INTO household (id, name, timezone, created_at, updated_at)
VALUES (
    'a1b2c3d4-0000-0000-0000-000000000001',
    'The Smith Family',
    'America/New_York',
    NOW(),
    NOW()
)
ON CONFLICT (id) DO NOTHING;

-- ── Members ───────────────────────────────────────────────────────────────

INSERT INTO member (id, household_id, name, full_name, role, color, initial, stars, streak, created_at, updated_at)
VALUES
    ('a1b2c3d4-0000-0000-0000-000000000010', 'a1b2c3d4-0000-0000-0000-000000000001', 'Alex',  'Alex Smith',  'adult', '#4F86C6', 'A', 142, 12, NOW(), NOW()),
    ('a1b2c3d4-0000-0000-0000-000000000011', 'a1b2c3d4-0000-0000-0000-000000000001', 'Jamie', 'Jamie Smith', 'adult', '#E8965A', 'J', 98,  7,  NOW(), NOW()),
    ('a1b2c3d4-0000-0000-0000-000000000012', 'a1b2c3d4-0000-0000-0000-000000000001', 'Sam',   'Sam Smith',   'child', '#6BC49A', 'S', 67,  5,  NOW(), NOW()),
    ('a1b2c3d4-0000-0000-0000-000000000013', 'a1b2c3d4-0000-0000-0000-000000000001', 'Riley', 'Riley Smith', 'child', '#C47EB5', 'R', 45,  3,  NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ── Sample events (current week) ──────────────────────────────────────────

INSERT INTO event (id, household_id, title, start_time, end_time, location, event_type, created_at, updated_at)
VALUES
    ('a1b2c3d4-0000-0000-0000-000000000020', 'a1b2c3d4-0000-0000-0000-000000000001', 'School — Sam',       NOW()::date + '08:30'::time, NOW()::date + '15:00'::time, 'Lincoln Elementary',  'school',    NOW(), NOW()),
    ('a1b2c3d4-0000-0000-0000-000000000021', 'a1b2c3d4-0000-0000-0000-000000000001', 'Soccer Practice',    NOW()::date + '16:00'::time, NOW()::date + '17:30'::time, 'Riverside Park Field', 'activity',  NOW(), NOW()),
    ('a1b2c3d4-0000-0000-0000-000000000022', 'a1b2c3d4-0000-0000-0000-000000000001', 'Family Dinner',      NOW()::date + '18:30'::time, NOW()::date + '19:30'::time, 'Home',                 'meal',      NOW(), NOW()),
    ('a1b2c3d4-0000-0000-0000-000000000023', 'a1b2c3d4-0000-0000-0000-000000000001', 'Dentist — Riley',   NOW()::date + '10:00'::time + interval '1 day', NOW()::date + '10:45'::time + interval '1 day', 'Bright Smiles Dental', 'appointment', NOW(), NOW()),
    ('a1b2c3d4-0000-0000-0000-000000000024', 'a1b2c3d4-0000-0000-0000-000000000001', 'Groceries',          NOW()::date + '11:00'::time + interval '2 days', NOW()::date + '12:00'::time + interval '2 days', 'Whole Foods',         'errand',    NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ── Event → Member assignments ─────────────────────────────────────────────

INSERT INTO event_member (event_id, member_id)
VALUES
    ('a1b2c3d4-0000-0000-0000-000000000020', 'a1b2c3d4-0000-0000-0000-000000000012'),
    ('a1b2c3d4-0000-0000-0000-000000000021', 'a1b2c3d4-0000-0000-0000-000000000012'),
    ('a1b2c3d4-0000-0000-0000-000000000021', 'a1b2c3d4-0000-0000-0000-000000000013'),
    ('a1b2c3d4-0000-0000-0000-000000000022', 'a1b2c3d4-0000-0000-0000-000000000010'),
    ('a1b2c3d4-0000-0000-0000-000000000022', 'a1b2c3d4-0000-0000-0000-000000000011'),
    ('a1b2c3d4-0000-0000-0000-000000000022', 'a1b2c3d4-0000-0000-0000-000000000012'),
    ('a1b2c3d4-0000-0000-0000-000000000022', 'a1b2c3d4-0000-0000-0000-000000000013'),
    ('a1b2c3d4-0000-0000-0000-000000000023', 'a1b2c3d4-0000-0000-0000-000000000013'),
    ('a1b2c3d4-0000-0000-0000-000000000024', 'a1b2c3d4-0000-0000-0000-000000000011')
ON CONFLICT DO NOTHING;

-- ── Sample routines ───────────────────────────────────────────────────────

INSERT INTO routine (id, household_id, member_id, name, created_at, updated_at)
VALUES
    ('a1b2c3d4-0000-0000-0000-000000000030', 'a1b2c3d4-0000-0000-0000-000000000001', 'a1b2c3d4-0000-0000-0000-000000000012', 'Morning Routine', NOW(), NOW()),
    ('a1b2c3d4-0000-0000-0000-000000000031', 'a1b2c3d4-0000-0000-0000-000000000001', 'a1b2c3d4-0000-0000-0000-000000000013', 'Bedtime Routine', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO routine_step (id, routine_id, household_id, emoji, name, duration_minutes, sort_order, created_at, updated_at)
VALUES
    ('a1b2c3d4-0000-0000-0000-000000000040', 'a1b2c3d4-0000-0000-0000-000000000030', 'a1b2c3d4-0000-0000-0000-000000000001', '🌅', 'Wake up',        5,  1, NOW(), NOW()),
    ('a1b2c3d4-0000-0000-0000-000000000041', 'a1b2c3d4-0000-0000-0000-000000000030', 'a1b2c3d4-0000-0000-0000-000000000001', '🚿', 'Shower',          10, 2, NOW(), NOW()),
    ('a1b2c3d4-0000-0000-0000-000000000042', 'a1b2c3d4-0000-0000-0000-000000000030', 'a1b2c3d4-0000-0000-0000-000000000001', '🪥', 'Brush teeth',     5,  3, NOW(), NOW()),
    ('a1b2c3d4-0000-0000-0000-000000000043', 'a1b2c3d4-0000-0000-0000-000000000030', 'a1b2c3d4-0000-0000-0000-000000000001', '🥣', 'Breakfast',       15, 4, NOW(), NOW()),
    ('a1b2c3d4-0000-0000-0000-000000000044', 'a1b2c3d4-0000-0000-0000-000000000030', 'a1b2c3d4-0000-0000-0000-000000000001', '🎒', 'Pack backpack',   5,  5, NOW(), NOW()),
    ('a1b2c3d4-0000-0000-0000-000000000045', 'a1b2c3d4-0000-0000-0000-000000000031', 'a1b2c3d4-0000-0000-0000-000000000001', '🛁', 'Bath',            15, 1, NOW(), NOW()),
    ('a1b2c3d4-0000-0000-0000-000000000046', 'a1b2c3d4-0000-0000-0000-000000000031', 'a1b2c3d4-0000-0000-0000-000000000001', '🪥', 'Brush teeth',     5,  2, NOW(), NOW()),
    ('a1b2c3d4-0000-0000-0000-000000000047', 'a1b2c3d4-0000-0000-0000-000000000031', 'a1b2c3d4-0000-0000-0000-000000000001', '📖', 'Read a story',    15, 3, NOW(), NOW()),
    ('a1b2c3d4-0000-0000-0000-000000000048', 'a1b2c3d4-0000-0000-0000-000000000031', 'a1b2c3d4-0000-0000-0000-000000000001', '💤', 'Lights out',      0,  4, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

COMMIT;

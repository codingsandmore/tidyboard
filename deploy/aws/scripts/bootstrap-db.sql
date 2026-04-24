-- bootstrap-db.sql
-- Run ONCE as the RDS master user against the shared cutly-db instance.
-- Do NOT run this as the tidyboard role itself.
--
-- Usage: see bootstrap-db.sh (it handles password substitution and psql invocation).
--
-- What this does:
--   1. Creates the dedicated `tidyboard` role with the password stored in
--      Secrets Manager (tidyboard-prod/database/password).
--   2. Creates the `tidyboard` schema owned by that role.
--   3. Sets search_path so every subsequent connection by the tidyboard role
--      lands tables in the tidyboard schema — no migration changes needed.
--   4. Grants the minimum permissions needed on the shared `public` schema.

CREATE USER tidyboard WITH ENCRYPTED PASSWORD 'TIDYBOARD_DB_PASSWORD_PLACEHOLDER';

CREATE SCHEMA IF NOT EXISTS tidyboard AUTHORIZATION tidyboard;

-- search_path sticks to the role permanently; applied on every new connection.
ALTER ROLE tidyboard SET search_path TO tidyboard, public;

-- Allow tidyboard to use public (e.g. extensions like pgcrypto live there).
GRANT USAGE ON SCHEMA public TO tidyboard;

-- Allow tidyboard to create objects only in its own schema.
GRANT CREATE ON SCHEMA tidyboard TO tidyboard;

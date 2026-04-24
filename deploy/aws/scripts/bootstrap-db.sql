-- bootstrap-db.sql
-- Run ONCE as the RDS master user against the shared cutly-db instance.
-- Do NOT run this as the tidyboard role itself.
--
-- Usage: see bootstrap-db.sh (it handles password substitution and psql invocation).
--
-- Idempotent: safe to re-run. CREATE USER is guarded; CREATE SCHEMA uses IF NOT EXISTS.

-- 1. Create or update the tidyboard role.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'tidyboard') THEN
    CREATE USER tidyboard WITH ENCRYPTED PASSWORD 'TIDYBOARD_DB_PASSWORD_PLACEHOLDER';
  ELSE
    ALTER USER tidyboard WITH ENCRYPTED PASSWORD 'TIDYBOARD_DB_PASSWORD_PLACEHOLDER';
  END IF;
END$$;

-- 2. RDS quirk: the master user is `rds_superuser`, not a real superuser.
-- To CREATE SCHEMA AUTHORIZATION tidyboard, the executing role must be a member
-- of the tidyboard role. Grant membership to whoever is running this script.
GRANT tidyboard TO current_user;

-- 3. Create the schema owned by tidyboard.
CREATE SCHEMA IF NOT EXISTS tidyboard AUTHORIZATION tidyboard;

-- 4. search_path sticks to the role permanently; applied on every new connection.
ALTER ROLE tidyboard SET search_path TO tidyboard, public;

-- 5. Minimum grants on the shared public schema (extensions like pgcrypto live there).
GRANT USAGE ON SCHEMA public TO tidyboard;

-- 6. Let tidyboard create objects in its own schema.
GRANT CREATE ON SCHEMA tidyboard TO tidyboard;

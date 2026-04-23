# Migrations

Database migrations are managed with [goose](https://github.com/pressly/goose).

## Install goose

```bash
go install github.com/pressly/goose/v3/cmd/goose@latest
```

## Running migrations

```bash
# Apply all pending migrations
goose -dir migrations postgres "$DATABASE_URL" up

# Roll back the last migration
goose -dir migrations postgres "$DATABASE_URL" down

# Show migration status
goose -dir migrations postgres "$DATABASE_URL" status

# via Makefile (reads config.yaml / env vars)
make migrate
```

## Environment variables

Set `TIDYBOARD_DATABASE_*` env vars or use `config.yaml`:

```bash
export TIDYBOARD_DATABASE_HOST=localhost
export TIDYBOARD_DATABASE_PORT=5432
export TIDYBOARD_DATABASE_NAME=tidyboard
export TIDYBOARD_DATABASE_USER=tidyboard
export TIDYBOARD_DATABASE_PASSWORD=secret
```

## Migration naming convention

```
YYYYMMDDHHMMSS_description.sql
```

Example: `20260423000001_init_accounts.sql`

Goose reads the timestamp prefix to determine order. Never rename a migration that has been applied to any environment.

## Migration order

1. `20260423000001_init_accounts.sql` — `accounts` table
2. `20260423000002_init_households.sql` — `households`, `invitations`, `join_requests`
3. `20260423000003_init_members.sql` — `members`
4. `20260423000004_init_events.sql` — `calendars`, `events`
5. `20260423000005_init_lists.sql` — `lists`, `list_items`
6. `20260423000006_init_recipes.sql` — `recipes`, `recipe_ingredients`, `recipe_steps`, `ingredient_canonical`
7. `20260423000007_init_audit.sql` — `audit_entries`, `backup_records`

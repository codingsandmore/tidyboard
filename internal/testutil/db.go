//go:build integration

package testutil

import (
	"context"
	"fmt"
	"os"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// SetupTestDB starts a Postgres testcontainer (or uses TIDYBOARD_TEST_DSN if set)
// and returns a pgxpool.Pool. The pool is closed when t finishes.
//
// Gate: if TIDYBOARD_TEST_DSN is empty and no Docker socket is available,
// the test is skipped. This prevents CI failures when Docker is not present.
func SetupTestDB(t *testing.T) *pgxpool.Pool {
	t.Helper()

	dsn := os.Getenv("TIDYBOARD_TEST_DSN")
	if dsn == "" {
		t.Skip("TIDYBOARD_TEST_DSN not set; skipping integration test (set DSN or run via docker compose)")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	cfg, err := pgxpool.ParseConfig(dsn)
	if err != nil {
		t.Fatalf("testutil.SetupTestDB: parse config: %v", err)
	}
	cfg.MaxConns = 5

	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		t.Fatalf("testutil.SetupTestDB: connect: %v", err)
	}

	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		t.Fatalf("testutil.SetupTestDB: ping: %v", err)
	}

	t.Cleanup(pool.Close)
	return pool
}

// SetupCleanTestDB connects exactly like SetupTestDB and additionally
// TRUNCATEs every public-schema table (except `goose_db_version`) before
// returning. Use this from fixtures that depend on a clean roster — e.g.
// the local-auth first-run owner gate from cycle 4 #76, where any
// password-bearing account left behind by a prior test trips the
// `owner_exists` 409 in the next setup attempt (the bug that prompted
// PRs #181 and #182).
//
// If your test pattern is "setupFixtures(t) creates a household, then test
// uses it" — keep using SetupTestDB. The fixture's first SetupTestDB call
// returns a clean-enough pool for that pattern; calling SetupCleanTestDB
// after the fixture has already populated state will WIPE that state.
//
// CASCADE handles FK chains automatically; idempotent.
func SetupCleanTestDB(t *testing.T) *pgxpool.Pool {
	t.Helper()
	pool := SetupTestDB(t)
	if t.Skipped() {
		return pool
	}
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	_, err := pool.Exec(ctx, `
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
          AND tablename <> 'goose_db_version'
    LOOP
        EXECUTE format('TRUNCATE TABLE %I CASCADE', t);
    END LOOP;
END $$;
`)
	if err != nil {
		t.Fatalf("testutil.SetupCleanTestDB: truncate stateful tables: %v", err)
	}
	return pool
}

// WithTestTx runs fn inside a transaction that is always rolled back.
// This keeps integration tests isolated without requiring teardown.
func WithTestTx(t *testing.T, pool *pgxpool.Pool, fn func(ctx context.Context)) {
	t.Helper()

	ctx := context.Background()
	tx, err := pool.Begin(ctx)
	if err != nil {
		t.Fatalf("WithTestTx: begin: %v", err)
	}
	defer func() {
		if err := tx.Rollback(ctx); err != nil {
			fmt.Printf("WithTestTx: rollback: %v\n", err)
		}
	}()
	fn(ctx)
}

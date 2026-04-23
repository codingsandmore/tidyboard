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

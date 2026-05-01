//go:build integration

package seed_test

import (
	"context"
	"os"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/tidyboard/tidyboard/internal/query"
	"github.com/tidyboard/tidyboard/internal/test/seed"
)

// setupSeedDB connects to the test Postgres pointed at by TIDYBOARD_TEST_DSN.
// Skips when the env var is missing so the suite is portable across CI envs.
func setupSeedDB(t *testing.T) *pgxpool.Pool {
	t.Helper()
	dsn := os.Getenv("TIDYBOARD_TEST_DSN")
	if dsn == "" {
		t.Skip("TIDYBOARD_TEST_DSN not set; skipping integration test")
	}
	ctx, cancel := context.WithCancel(context.Background())
	t.Cleanup(cancel)

	cfg, err := pgxpool.ParseConfig(dsn)
	require.NoError(t, err)
	cfg.MaxConns = 5

	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	require.NoError(t, err)
	t.Cleanup(pool.Close)
	require.NoError(t, pool.Ping(ctx))
	return pool
}

// cleanFlintstones wipes any prior Flintstones/Rubbles seed so the test starts
// from a deterministic baseline. Cascade deletes from households remove the
// dependent rows in members/events/recipes/etc.
func cleanFlintstones(t *testing.T, pool *pgxpool.Pool) {
	t.Helper()
	ctx := context.Background()
	_, err := pool.Exec(ctx,
		`DELETE FROM households WHERE id = $1 OR id = $2`,
		seed.FlintstoneHousehold, seed.RubbleHousehold)
	require.NoError(t, err)
	_, err = pool.Exec(ctx,
		`DELETE FROM accounts WHERE id = $1 OR id = $2`,
		seed.FlintstoneAccount, seed.RubbleAccount)
	require.NoError(t, err)
}

func TestSeedFlintstones_Households(t *testing.T) {
	pool := setupSeedDB(t)
	cleanFlintstones(t, pool)
	q := query.New(pool)

	require.NoError(t, seed.SeedFlintstones(context.Background(), q))

	flint, err := q.GetHousehold(context.Background(), seed.FlintstoneHousehold)
	require.NoError(t, err)
	assert.Equal(t, "Flintstones", flint.Name)

	rubble, err := q.GetHousehold(context.Background(), seed.RubbleHousehold)
	require.NoError(t, err)
	assert.Equal(t, "Rubbles", rubble.Name)

	flintMembers, err := q.ListMembers(context.Background(), seed.FlintstoneHousehold)
	require.NoError(t, err)
	memberIDs := make(map[string]bool, len(flintMembers))
	for _, m := range flintMembers {
		memberIDs[m.ID.String()] = true
	}
	assert.True(t, memberIDs[seed.Fred.String()], "Fred must be a Flintstone member")
	assert.True(t, memberIDs[seed.Wilma.String()], "Wilma must be a Flintstone member")
	assert.True(t, memberIDs[seed.Pebbles.String()], "Pebbles must be a Flintstone member")
	assert.True(t, memberIDs[seed.Dino.String()], "Dino must be a Flintstone member")

	rubbleMembers, err := q.ListMembers(context.Background(), seed.RubbleHousehold)
	require.NoError(t, err)
	rubbleIDs := make(map[string]bool, len(rubbleMembers))
	for _, m := range rubbleMembers {
		rubbleIDs[m.ID.String()] = true
	}
	assert.True(t, rubbleIDs[seed.Barney.String()], "Barney must be a Rubble member")
	assert.True(t, rubbleIDs[seed.Betty.String()], "Betty must be a Rubble member")
	assert.True(t, rubbleIDs[seed.BammBamm.String()], "Bamm-Bamm must be a Rubble member")
	assert.True(t, rubbleIDs[seed.Hoppy.String()], "Hoppy must be a Rubble member")
}

func TestSeedFlintstones_Idempotent(t *testing.T) {
	pool := setupSeedDB(t)
	cleanFlintstones(t, pool)
	q := query.New(pool)

	// First run.
	require.NoError(t, seed.SeedFlintstones(context.Background(), q))
	first, err := q.ListMembers(context.Background(), seed.FlintstoneHousehold)
	require.NoError(t, err)
	require.Len(t, first, 4, "Flintstones household must have exactly 4 members after first seed")

	// Second run — must be a no-op (no error, no duplicates).
	require.NoError(t, seed.SeedFlintstones(context.Background(), q),
		"re-running SeedFlintstones must not error")
	second, err := q.ListMembers(context.Background(), seed.FlintstoneHousehold)
	require.NoError(t, err)
	assert.Len(t, second, 4, "Flintstones household must still have exactly 4 members after re-seed")

	// And the Rubble side too.
	rubble, err := q.ListMembers(context.Background(), seed.RubbleHousehold)
	require.NoError(t, err)
	assert.Len(t, rubble, 4, "Rubble household must have exactly 4 members after re-seed")
}

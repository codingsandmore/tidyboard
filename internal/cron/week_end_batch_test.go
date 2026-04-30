//go:build integration

package cron_test

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/tidyboard/tidyboard/internal/broadcast"
	"github.com/tidyboard/tidyboard/internal/cron"
	"github.com/tidyboard/tidyboard/internal/query"
	"github.com/tidyboard/tidyboard/internal/service"
	"github.com/tidyboard/tidyboard/internal/testutil"
)

func TestWeekEndBatch_StreakBonusOnComplete100Percent(t *testing.T) {
	if testing.Short() {
		t.Skip("integration: requires TIDYBOARD_TEST_DSN")
	}

	p := testutil.SetupTestDB(t)
	q := query.New(p)
	bc := broadcast.NewMemoryBroadcaster()
	walletSvc := service.NewWalletService(q, bc, nil)
	choreSvc := service.NewChoreService(q, walletSvc, bc, nil)

	householdID := uuid.New()
	memberID := uuid.New()
	ctx := context.Background()

	creatorAccountID := uuid.New()
	_, err := p.Exec(ctx,
		`INSERT INTO accounts (id, email, password_hash) VALUES ($1, $2, 'x') ON CONFLICT DO NOTHING`,
		creatorAccountID, creatorAccountID.String()+"@example.com",
	)
	require.NoError(t, err)

	_, err = p.Exec(ctx,
		`INSERT INTO households (id, name, timezone, invite_code, created_by) VALUES ($1, 'WeekEndTest', 'UTC', 'WEBATCH1', $2)`,
		householdID, creatorAccountID,
	)
	require.NoError(t, err)

	memberAccountID := uuid.New()
	_, err = p.Exec(ctx,
		`INSERT INTO accounts (id, email, password_hash) VALUES ($1, $2, 'x') ON CONFLICT DO NOTHING`,
		memberAccountID, memberAccountID.String()+"@example.com",
	)
	require.NoError(t, err)

	_, err = p.Exec(ctx,
		`INSERT INTO members (id, household_id, account_id, name, display_name, role) VALUES ($1, $2, $3, 'Kid', 'Kid', 'child')`,
		memberID, householdID, memberAccountID,
	)
	require.NoError(t, err)

	t.Cleanup(func() {
		bgCtx := context.Background()
		_, _ = p.Exec(bgCtx, `DELETE FROM weekly_summaries WHERE household_id = $1`, householdID)
		_, _ = p.Exec(bgCtx, `DELETE FROM chore_completions WHERE chore_id IN (SELECT id FROM chores WHERE household_id = $1)`, householdID)
		_, _ = p.Exec(bgCtx, `DELETE FROM chores WHERE household_id = $1`, householdID)
		_, _ = p.Exec(bgCtx, `DELETE FROM allowance_settings WHERE household_id = $1`, householdID)
		_, _ = p.Exec(bgCtx, `DELETE FROM wallet_transactions WHERE member_id = $1`, memberID)
		_, _ = p.Exec(bgCtx, `DELETE FROM wallets WHERE member_id = $1`, memberID)
		_, _ = p.Exec(bgCtx, `DELETE FROM members WHERE id = $1`, memberID)
		_, _ = p.Exec(bgCtx, `DELETE FROM households WHERE id = $1`, householdID)
		_, _ = p.Exec(bgCtx, `DELETE FROM accounts WHERE id = $1`, memberAccountID)
		_, _ = p.Exec(bgCtx, `DELETE FROM accounts WHERE id = $1`, creatorAccountID)
	})

	// Seed $5/week allowance.
	_, err = q.UpsertAllowance(ctx, query.UpsertAllowanceParams{
		HouseholdID: householdID,
		MemberID:    memberID,
		AmountCents: 500,
		ActiveFrom:  pgtype.Date{Time: time.Now().UTC().AddDate(0, 0, -30), Valid: true},
	})
	require.NoError(t, err)

	// Create one daily chore (frequency = 7/week), weight=3, auto_approve=true.
	chore, err := choreSvc.Create(ctx, householdID, service.ChoreCreateInput{
		MemberID:      memberID,
		Name:          "feed dog",
		Weight:        3,
		FrequencyKind: "daily",
		AutoApprove:   true,
	})
	require.NoError(t, err)

	// Compute last full week dates (same logic as batch).
	weekStart, _ := lastFullWeekForTest(time.Now().UTC())

	// Mark the chore complete for all 7 days of last week.
	d := weekStart
	for i := 0; i < 7; i++ {
		_, err := choreSvc.Complete(ctx, householdID, chore.ID, d, memberID)
		require.NoError(t, err, "complete chore for %v", d)
		d = d.AddDate(0, 0, 1)
	}

	balanceBefore, err := walletSvc.GetWallet(ctx, memberID)
	require.NoError(t, err)
	t.Logf("balance before batch: %d", balanceBefore.BalanceCents)

	// Run the batch for this household.
	batch := cron.WeekEndBatch{Q: q, WS: walletSvc}
	require.NoError(t, batch.RunForHousehold(ctx, householdID))

	balanceAfter, err := walletSvc.GetWallet(ctx, memberID)
	require.NoError(t, err)
	delta := balanceAfter.BalanceCents - balanceBefore.BalanceCents
	t.Logf("balance after batch: %d (delta %d)", balanceAfter.BalanceCents, delta)

	// Streak bonus must have landed (balance must increase).
	assert.Positive(t, delta, "expected balance to increase from streak bonus")

	// Weekly summary row must exist with correct counts.
	sum, err := q.GetWeeklySummary(ctx, query.GetWeeklySummaryParams{
		MemberID:  memberID,
		WeekStart: pgtype.Date{Time: weekStart, Valid: true},
	})
	require.NoError(t, err)
	assert.Equal(t, int32(7), sum.ChoresCompleted, "chores_completed")
	assert.Equal(t, int32(7), sum.ChoresPossible, "chores_possible")
	assert.Positive(t, sum.StreakBonusCents, "streak_bonus_cents")
}

func TestWeekEndBatch_NoBonus_WhenIncomplete(t *testing.T) {
	if testing.Short() {
		t.Skip("integration: requires TIDYBOARD_TEST_DSN")
	}

	p := testutil.SetupTestDB(t)
	q := query.New(p)
	bc := broadcast.NewMemoryBroadcaster()
	walletSvc := service.NewWalletService(q, bc, nil)
	choreSvc := service.NewChoreService(q, walletSvc, bc, nil)

	householdID := uuid.New()
	memberID := uuid.New()
	ctx := context.Background()

	creatorAccountID := uuid.New()
	_, err := p.Exec(ctx,
		`INSERT INTO accounts (id, email, password_hash) VALUES ($1, $2, 'x') ON CONFLICT DO NOTHING`,
		creatorAccountID, creatorAccountID.String()+"@example.com",
	)
	require.NoError(t, err)

	_, err = p.Exec(ctx,
		`INSERT INTO households (id, name, timezone, invite_code, created_by) VALUES ($1, 'WeekEndTest2', 'UTC', 'WEBATCH2', $2)`,
		householdID, creatorAccountID,
	)
	require.NoError(t, err)

	memberAccountID := uuid.New()
	_, err = p.Exec(ctx,
		`INSERT INTO accounts (id, email, password_hash) VALUES ($1, $2, 'x') ON CONFLICT DO NOTHING`,
		memberAccountID, memberAccountID.String()+"@example.com",
	)
	require.NoError(t, err)

	_, err = p.Exec(ctx,
		`INSERT INTO members (id, household_id, account_id, name, display_name, role) VALUES ($1, $2, $3, 'Kid', 'Kid', 'child')`,
		memberID, householdID, memberAccountID,
	)
	require.NoError(t, err)

	t.Cleanup(func() {
		bgCtx := context.Background()
		_, _ = p.Exec(bgCtx, `DELETE FROM weekly_summaries WHERE household_id = $1`, householdID)
		_, _ = p.Exec(bgCtx, `DELETE FROM chore_completions WHERE chore_id IN (SELECT id FROM chores WHERE household_id = $1)`, householdID)
		_, _ = p.Exec(bgCtx, `DELETE FROM chores WHERE household_id = $1`, householdID)
		_, _ = p.Exec(bgCtx, `DELETE FROM allowance_settings WHERE household_id = $1`, householdID)
		_, _ = p.Exec(bgCtx, `DELETE FROM wallet_transactions WHERE member_id = $1`, memberID)
		_, _ = p.Exec(bgCtx, `DELETE FROM wallets WHERE member_id = $1`, memberID)
		_, _ = p.Exec(bgCtx, `DELETE FROM members WHERE id = $1`, memberID)
		_, _ = p.Exec(bgCtx, `DELETE FROM households WHERE id = $1`, householdID)
		_, _ = p.Exec(bgCtx, `DELETE FROM accounts WHERE id = $1`, memberAccountID)
		_, _ = p.Exec(bgCtx, `DELETE FROM accounts WHERE id = $1`, creatorAccountID)
	})

	_, err = q.UpsertAllowance(ctx, query.UpsertAllowanceParams{
		HouseholdID: householdID,
		MemberID:    memberID,
		AmountCents: 500,
		ActiveFrom:  pgtype.Date{Time: time.Now().UTC().AddDate(0, 0, -30), Valid: true},
	})
	require.NoError(t, err)

	// Create one daily chore but only complete 6 of 7 days — no streak bonus expected.
	chore, err := choreSvc.Create(ctx, householdID, service.ChoreCreateInput{
		MemberID:      memberID,
		Name:          "walk dog",
		Weight:        3,
		FrequencyKind: "daily",
		AutoApprove:   true,
	})
	require.NoError(t, err)

	weekStart, _ := lastFullWeekForTest(time.Now().UTC())

	d := weekStart
	for i := 0; i < 6; i++ { // only 6 of 7
		_, err := choreSvc.Complete(ctx, householdID, chore.ID, d, memberID)
		require.NoError(t, err)
		d = d.AddDate(0, 0, 1)
	}

	batch := cron.WeekEndBatch{Q: q, WS: walletSvc}
	require.NoError(t, batch.RunForHousehold(ctx, householdID))

	sum, err := q.GetWeeklySummary(ctx, query.GetWeeklySummaryParams{
		MemberID:  memberID,
		WeekStart: pgtype.Date{Time: weekStart, Valid: true},
	})
	require.NoError(t, err)
	assert.Equal(t, int32(6), sum.ChoresCompleted, "chores_completed")
	assert.Equal(t, int32(7), sum.ChoresPossible, "chores_possible")
	assert.Equal(t, int64(0), sum.StreakBonusCents, "streak_bonus_cents should be 0 for incomplete week")
}

// lastFullWeekForTest mirrors the batch's lastFullWeek logic so tests use
// the same date range the batch does.
func lastFullWeekForTest(now time.Time) (time.Time, time.Time) {
	today := now.Truncate(24 * time.Hour)
	dow := int(today.Weekday())
	thisSunday := today.AddDate(0, 0, -dow)
	lastSunday := thisSunday.AddDate(0, 0, -7)
	lastSaturday := thisSunday.AddDate(0, 0, -1)
	return lastSunday, lastSaturday
}

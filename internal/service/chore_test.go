//go:build integration

package service

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/tidyboard/tidyboard/internal/broadcast"
	"github.com/tidyboard/tidyboard/internal/query"
	"github.com/tidyboard/tidyboard/internal/testutil"
)

// seedChoreTestFixture creates household + child member + wallet svc + chore svc.
// Returns householdID, memberID, walletSvc, choreSvc, and a cleanup func.
func seedChoreTestFixture(t *testing.T, inviteCode string) (householdID, memberID uuid.UUID, walletSvc *WalletService, choreSvc *ChoreService) {
	t.Helper()

	pool := testutil.SetupTestDB(t)
	q := query.New(pool)
	bc := broadcast.NewMemoryBroadcaster()

	walletSvc = NewWalletService(q, bc, nil)
	choreSvc = NewChoreService(q, walletSvc, bc, nil)

	householdID = uuid.New()
	memberID = uuid.New()
	ctx := context.Background()

	creatorAccountID := uuid.New()
	_, err := pool.Exec(ctx,
		`INSERT INTO accounts (id, email, password_hash) VALUES ($1, $2, 'x') ON CONFLICT DO NOTHING`,
		creatorAccountID, creatorAccountID.String()+"@example.com",
	)
	require.NoError(t, err)

	_, err = pool.Exec(ctx,
		`INSERT INTO households (id, name, timezone, invite_code, created_by) VALUES ($1, 'ChoreTest', 'UTC', $2, $3)`,
		householdID, inviteCode, creatorAccountID,
	)
	require.NoError(t, err)

	memberAccountID := uuid.New()
	_, err = pool.Exec(ctx,
		`INSERT INTO accounts (id, email, password_hash) VALUES ($1, $2, 'x') ON CONFLICT DO NOTHING`,
		memberAccountID, memberAccountID.String()+"@example.com",
	)
	require.NoError(t, err)

	_, err = pool.Exec(ctx,
		`INSERT INTO members (id, household_id, account_id, name, display_name, role) VALUES ($1, $2, $3, 'Kid', 'Kid', 'child')`,
		memberID, householdID, memberAccountID,
	)
	require.NoError(t, err)

	t.Cleanup(func() {
		bgCtx := context.Background()
		_, _ = pool.Exec(bgCtx, `DELETE FROM chore_completions WHERE chore_id IN (SELECT id FROM chores WHERE household_id = $1)`, householdID)
		_, _ = pool.Exec(bgCtx, `DELETE FROM chores WHERE household_id = $1`, householdID)
		_, _ = pool.Exec(bgCtx, `DELETE FROM allowance_settings WHERE household_id = $1`, householdID)
		_, _ = pool.Exec(bgCtx, `DELETE FROM wallet_transactions WHERE member_id = $1`, memberID)
		_, _ = pool.Exec(bgCtx, `DELETE FROM wallets WHERE member_id = $1`, memberID)
		_, _ = pool.Exec(bgCtx, `DELETE FROM members WHERE id = $1`, memberID)
		_, _ = pool.Exec(bgCtx, `DELETE FROM households WHERE id = $1`, householdID)
		_, _ = pool.Exec(bgCtx, `DELETE FROM accounts WHERE id = $1`, memberAccountID)
		_, _ = pool.Exec(bgCtx, `DELETE FROM accounts WHERE id = $1`, creatorAccountID)
	})

	// Seed $5/week allowance via UpsertAllowance.
	_, err = q.UpsertAllowance(ctx, query.UpsertAllowanceParams{
		HouseholdID: householdID,
		MemberID:    memberID,
		AmountCents: 500,
		ActiveFrom:  pgtype.Date{Time: time.Now().UTC().AddDate(0, 0, -1), Valid: true},
	})
	require.NoError(t, err)

	return householdID, memberID, walletSvc, choreSvc
}

func TestChoreService_Complete_AutoApprovedCreditsWallet(t *testing.T) {
	if testing.Short() {
		t.Skip("integration: requires TIDYBOARD_TEST_DSN")
	}

	householdID, memberID, walletSvc, choreSvc := seedChoreTestFixture(t, "CHORE1")
	ctx := context.Background()

	// Create one daily chore, weight=3, auto_approve=true.
	chore, err := choreSvc.Create(ctx, householdID, ChoreCreateInput{
		MemberID:      memberID,
		Name:          "Make Bed",
		Weight:        3,
		FrequencyKind: "daily",
		AutoApprove:   true,
	})
	require.NoError(t, err)

	// Complete it for today.
	today := time.Now().UTC()
	_, err = choreSvc.Complete(ctx, householdID, chore.ID, today, memberID)
	require.NoError(t, err)

	// Expected: PerInstancePayout(500, 3, WeeklyDivisor([3], [7])) = floor(1500/21) = 71
	expectedPayout := PerInstancePayout(500, 3, WeeklyDivisor([]int{3}, []int{7}))
	assert.Equal(t, int64(71), expectedPayout)

	wallet, err := walletSvc.GetWallet(ctx, memberID)
	require.NoError(t, err)
	assert.Equal(t, expectedPayout, wallet.BalanceCents)
}

func TestChoreService_Complete_Idempotent(t *testing.T) {
	if testing.Short() {
		t.Skip("integration: requires TIDYBOARD_TEST_DSN")
	}

	householdID, memberID, walletSvc, choreSvc := seedChoreTestFixture(t, "CHORE2")
	ctx := context.Background()

	chore, err := choreSvc.Create(ctx, householdID, ChoreCreateInput{
		MemberID:      memberID,
		Name:          "Feed Pet",
		Weight:        3,
		FrequencyKind: "daily",
		AutoApprove:   true,
	})
	require.NoError(t, err)

	today := time.Now().UTC()

	// First completion.
	_, err = choreSvc.Complete(ctx, householdID, chore.ID, today, memberID)
	require.NoError(t, err)

	// Second completion for the same date — must be idempotent.
	_, err = choreSvc.Complete(ctx, householdID, chore.ID, today, memberID)
	require.NoError(t, err)

	// Balance must still be 71 cents (not doubled).
	wallet, err := walletSvc.GetWallet(ctx, memberID)
	require.NoError(t, err)
	assert.Equal(t, int64(71), wallet.BalanceCents)
}

func TestChoreService_Undo_ReversesCredit(t *testing.T) {
	if testing.Short() {
		t.Skip("integration: requires TIDYBOARD_TEST_DSN")
	}

	householdID, memberID, walletSvc, choreSvc := seedChoreTestFixture(t, "CHORE3")
	ctx := context.Background()

	chore, err := choreSvc.Create(ctx, householdID, ChoreCreateInput{
		MemberID:      memberID,
		Name:          "Set Table",
		Weight:        3,
		FrequencyKind: "daily",
		AutoApprove:   true,
	})
	require.NoError(t, err)

	today := time.Now().UTC()

	// Complete → balance should be 71.
	_, err = choreSvc.Complete(ctx, householdID, chore.ID, today, memberID)
	require.NoError(t, err)

	wallet, err := walletSvc.GetWallet(ctx, memberID)
	require.NoError(t, err)
	assert.Equal(t, int64(71), wallet.BalanceCents)

	// Undo → balance should return to 0.
	err = choreSvc.Undo(ctx, householdID, chore.ID, today)
	require.NoError(t, err)

	wallet, err = walletSvc.GetWallet(ctx, memberID)
	require.NoError(t, err)
	assert.Equal(t, int64(0), wallet.BalanceCents)
}

func TestChoreService_Complete_NonAutoApprove_DoesNotCredit(t *testing.T) {
	if testing.Short() {
		t.Skip("integration: requires TIDYBOARD_TEST_DSN")
	}

	householdID, memberID, walletSvc, choreSvc := seedChoreTestFixture(t, "CHORE4")
	ctx := context.Background()

	chore, err := choreSvc.Create(ctx, householdID, ChoreCreateInput{
		MemberID:      memberID,
		Name:          "Clean Room",
		Weight:        3,
		FrequencyKind: "daily",
		AutoApprove:   false, // requires manual approval
	})
	require.NoError(t, err)

	today := time.Now().UTC()
	completion, err := choreSvc.Complete(ctx, householdID, chore.ID, today, memberID)
	require.NoError(t, err)

	// Completion row should exist but not be approved.
	assert.False(t, completion.Approved)

	// Wallet balance must remain 0.
	wallet, err := walletSvc.GetWallet(ctx, memberID)
	require.NoError(t, err)
	assert.Equal(t, int64(0), wallet.BalanceCents)
}

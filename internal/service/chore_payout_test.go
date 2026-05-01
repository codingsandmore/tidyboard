//go:build integration

package service

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/tidyboard/tidyboard/internal/broadcast"
	"github.com/tidyboard/tidyboard/internal/query"
	"github.com/tidyboard/tidyboard/internal/testutil"
)

// seedFlintstoneChoreFixture provisions the minimum the issue-#137 acceptance
// tests need: a household with NO allowance configured (so the new flat
// payout-cents-per-weight fallback kicks in), one child member, one chore
// (weight = 2 — emulating "Feed Dino"), and a wallet with 50 cents in it
// (Pebbles' opening balance from the Flintstones seed).
//
// Returns householdID, childID, choreID, walletSvc, choreSvc.
func seedFlintstoneChoreFixture(
	t *testing.T,
	choreName string,
	weight int,
	autoApprove bool,
) (uuid.UUID, uuid.UUID, uuid.UUID, *pgxpool.Pool, *WalletService, *ChoreService) {
	t.Helper()

	pool := testutil.SetupTestDB(t)
	q := query.New(pool)
	bc := broadcast.NewMemoryBroadcaster()
	walletSvc := NewWalletService(q, bc, nil)
	choreSvc := NewChoreService(q, walletSvc, bc, nil)

	householdID := uuid.New()
	childID := uuid.New()
	ctx := context.Background()

	creatorAccountID := uuid.New()
	_, err := pool.Exec(ctx,
		`INSERT INTO accounts (id, email, password_hash) VALUES ($1, $2, 'x') ON CONFLICT DO NOTHING`,
		creatorAccountID, creatorAccountID.String()+"@example.com",
	)
	require.NoError(t, err)

	// Household — no allowance, no override of payout_cents_per_weight (= 500 default).
	_, err = pool.Exec(ctx,
		`INSERT INTO households (id, name, timezone, invite_code, created_by)
		 VALUES ($1, 'Bedrock', 'UTC', $2, $3)`,
		householdID, "FLINT-"+householdID.String()[:6], creatorAccountID,
	)
	require.NoError(t, err)

	// Child member.
	memberAccountID := uuid.New()
	_, err = pool.Exec(ctx,
		`INSERT INTO accounts (id, email, password_hash) VALUES ($1, $2, 'x') ON CONFLICT DO NOTHING`,
		memberAccountID, memberAccountID.String()+"@example.com",
	)
	require.NoError(t, err)
	_, err = pool.Exec(ctx,
		`INSERT INTO members (id, household_id, account_id, name, display_name, role)
		 VALUES ($1, $2, $3, 'Pebbles', 'Pebbles', 'child')`,
		childID, householdID, memberAccountID,
	)
	require.NoError(t, err)

	// 50-cent ("stones") opening balance — matches the Flintstones seed.
	w, err := q.GetOrCreateWallet(ctx, childID)
	require.NoError(t, err)
	_, err = q.CreateWalletTransaction(ctx, query.CreateWalletTransactionParams{
		ID:          uuid.New(),
		WalletID:    w.ID,
		MemberID:    childID,
		AmountCents: 50,
		Kind:        "adjustment",
		Reason:      "test seed: opening balance",
	})
	require.NoError(t, err)
	_, err = q.AdjustWalletBalance(ctx, query.AdjustWalletBalanceParams{
		MemberID:     childID,
		BalanceCents: 50,
	})
	require.NoError(t, err)

	chore, err := choreSvc.Create(ctx, householdID, ChoreCreateInput{
		MemberID:      childID,
		Name:          choreName,
		Weight:        weight,
		FrequencyKind: "daily",
		AutoApprove:   autoApprove,
	})
	require.NoError(t, err)

	t.Cleanup(func() {
		bgCtx := context.Background()
		_, _ = pool.Exec(bgCtx, `DELETE FROM chore_completions WHERE chore_id IN (SELECT id FROM chores WHERE household_id = $1)`, householdID)
		_, _ = pool.Exec(bgCtx, `DELETE FROM chores WHERE household_id = $1`, householdID)
		_, _ = pool.Exec(bgCtx, `DELETE FROM allowance_settings WHERE household_id = $1`, householdID)
		_, _ = pool.Exec(bgCtx, `DELETE FROM wallet_transactions WHERE member_id = $1`, childID)
		_, _ = pool.Exec(bgCtx, `DELETE FROM wallets WHERE member_id = $1`, childID)
		_, _ = pool.Exec(bgCtx, `DELETE FROM members WHERE id = $1`, childID)
		_, _ = pool.Exec(bgCtx, `DELETE FROM households WHERE id = $1`, householdID)
		_, _ = pool.Exec(bgCtx, `DELETE FROM accounts WHERE id = $1`, memberAccountID)
		_, _ = pool.Exec(bgCtx, `DELETE FROM accounts WHERE id = $1`, creatorAccountID)
	})

	return householdID, childID, chore.ID, pool, walletSvc, choreSvc
}

// TestChorePayout_HappyPath — issue #137, spec C.1.
//
// Pebbles completes "Feed Dino" (weight = 2). The household has no allowance
// configured, so the flat household-rate fallback applies: payout = 2 × 500
// = 1000 cents. Pebbles' wallet balance moves from 50 → 1050 cents and the
// new transaction is tagged kind='chore_payout'.
func TestChorePayout_HappyPath(t *testing.T) {
	if testing.Short() {
		t.Skip("integration: requires TIDYBOARD_TEST_DSN")
	}

	householdID, childID, choreID, pool, walletSvc, choreSvc :=
		seedFlintstoneChoreFixture(t, "Feed Dino", 2, true)
	ctx := context.Background()

	today := time.Now().UTC()
	completion, err := choreSvc.Complete(ctx, householdID, choreID, today, childID)
	require.NoError(t, err)
	require.True(t, completion.Approved, "auto-approved chore completion should land approved=true")
	assert.Equal(t, int32(1000), completion.PayoutCents,
		"weight=2 × default rate=500 should yield 1000 cents")

	wallet, err := walletSvc.GetWallet(ctx, childID)
	require.NoError(t, err)
	assert.Equal(t, int64(1050), wallet.BalanceCents,
		"50 (seed) + 1000 (payout) = 1050 cents")

	// Exactly one chore_payout transaction must exist for this completion.
	var n int
	require.NoError(t, pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM wallet_transactions
		 WHERE member_id = $1 AND kind = 'chore_payout'`, childID).Scan(&n))
	assert.Equal(t, 1, n, "exactly one chore_payout row")
}

// TestChorePayout_Idempotent — issue #137, spec C.2.
//
// Calling Complete twice for the same (chore_id, date) must be a no-op the
// second time: ON CONFLICT DO NOTHING on chore_completions, plus the partial
// unique index on wallet_transactions(reference_id) WHERE kind='chore_payout'
// guarantees the wallet is credited at most once.
func TestChorePayout_Idempotent(t *testing.T) {
	if testing.Short() {
		t.Skip("integration: requires TIDYBOARD_TEST_DSN")
	}

	householdID, childID, choreID, pool, walletSvc, choreSvc :=
		seedFlintstoneChoreFixture(t, "Feed Dino (twice)", 2, true)
	ctx := context.Background()

	today := time.Now().UTC()

	// First completion → credits 1000 cents.
	c1, err := choreSvc.Complete(ctx, householdID, choreID, today, childID)
	require.NoError(t, err)

	// Second completion on the same date → must be a no-op.
	c2, err := choreSvc.Complete(ctx, householdID, choreID, today, childID)
	require.NoError(t, err)
	assert.Equal(t, c1.ID, c2.ID, "second Complete returns the existing completion row")

	// Wallet balance unchanged on second call: 50 + 1000 = 1050.
	wallet, err := walletSvc.GetWallet(ctx, childID)
	require.NoError(t, err)
	assert.Equal(t, int64(1050), wallet.BalanceCents,
		"second Complete must not double-credit")

	// Exactly one chore_payout transaction.
	var n int
	require.NoError(t, pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM wallet_transactions
		 WHERE member_id = $1 AND kind = 'chore_payout'`, childID).Scan(&n))
	assert.Equal(t, 1, n, "still exactly one chore_payout row")
}

// TestChorePayout_NoPayoutOnUnclaim — issue #137, spec C.3.
//
// "Unclaim" in this codebase is `ChoreService.Undo`. After Undo the wallet
// balance must return to the seed value (50 cents) and there must be no
// negative chore_payout transaction left behind. The reversing transaction
// is recorded with kind='adjustment' (not 'chore_payout'), which is what
// keeps the chore_payout count at zero net effect.
func TestChorePayout_NoPayoutOnUnclaim(t *testing.T) {
	if testing.Short() {
		t.Skip("integration: requires TIDYBOARD_TEST_DSN")
	}

	householdID, childID, choreID, pool, walletSvc, choreSvc :=
		seedFlintstoneChoreFixture(t, "Feed Dino (undo)", 2, true)
	ctx := context.Background()

	today := time.Now().UTC()

	_, err := choreSvc.Complete(ctx, householdID, choreID, today, childID)
	require.NoError(t, err)

	wallet, err := walletSvc.GetWallet(ctx, childID)
	require.NoError(t, err)
	assert.Equal(t, int64(1050), wallet.BalanceCents)

	// Unclaim — the completion row is deleted and a reversing adjustment is
	// written.
	require.NoError(t, choreSvc.Undo(ctx, householdID, choreID, today))

	wallet, err = walletSvc.GetWallet(ctx, childID)
	require.NoError(t, err)
	assert.Equal(t, int64(50), wallet.BalanceCents,
		"undo must return wallet balance to seed value (50)")

	// Sanity: no negative chore_payout was inserted (the reversal uses
	// kind='adjustment', preserving the audit trail of the original payout).
	var negPayouts int
	require.NoError(t, pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM wallet_transactions
		 WHERE member_id = $1 AND kind = 'chore_payout' AND amount_cents < 0`,
		childID).Scan(&negPayouts))
	assert.Equal(t, 0, negPayouts,
		"unclaim must not leave a negative chore_payout entry")
}

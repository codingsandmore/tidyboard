//go:build integration

package service

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/tidyboard/tidyboard/internal/broadcast"
	"github.com/tidyboard/tidyboard/internal/query"
	"github.com/tidyboard/tidyboard/internal/testutil"
)

func TestWalletService_CreditWallet_AppendsTxAndAdjustsBalance(t *testing.T) {
	if testing.Short() {
		t.Skip("integration: requires TIDYBOARD_TEST_DSN")
	}

	pool := testutil.SetupTestDB(t)
	q := query.New(pool)
	bc := broadcast.NewMemoryBroadcaster()
	svc := NewWalletService(q, bc, nil)

	householdID := uuid.New()
	memberID := uuid.New()
	ctx := context.Background()
	creatorAccountID := uuid.New()

	// Seed a minimal member row so foreign-key constraints are satisfied.
	// wallet_transactions.member_id → members.id
	_, err := pool.Exec(ctx,
		`INSERT INTO accounts (id, email, password_hash) VALUES ($1, $2, 'x') ON CONFLICT DO NOTHING`,
		creatorAccountID, creatorAccountID.String()+"@example.com",
	)
	require.NoError(t, err)

	_, err = pool.Exec(ctx,
		`INSERT INTO households (id, name, timezone, invite_code, created_by) VALUES ($1, 'Test', 'UTC', 'WTEST1', $2)`,
		householdID, creatorAccountID,
	)
	require.NoError(t, err)

	memberAccountID := uuid.New()
	_, err = pool.Exec(ctx,
		`INSERT INTO accounts (id, email, password_hash) VALUES ($1, $2, 'x') ON CONFLICT DO NOTHING`,
		memberAccountID, memberAccountID.String()+"@example.com",
	)
	require.NoError(t, err)

	_, err = pool.Exec(ctx,
		`INSERT INTO members (id, household_id, account_id, name, display_name, role) VALUES ($1, $2, $3, 'Kid1', 'Kid1', 'child')`,
		memberID, householdID, memberAccountID,
	)
	require.NoError(t, err)

	t.Cleanup(func() {
		bgCtx := context.Background()
		_, _ = pool.Exec(bgCtx, `DELETE FROM wallet_transactions WHERE member_id = $1`, memberID)
		_, _ = pool.Exec(bgCtx, `DELETE FROM wallets WHERE member_id = $1`, memberID)
		_, _ = pool.Exec(bgCtx, `DELETE FROM members WHERE id = $1`, memberID)
		_, _ = pool.Exec(bgCtx, `DELETE FROM households WHERE id = $1`, householdID)
		_, _ = pool.Exec(bgCtx, `DELETE FROM accounts WHERE id = $1`, memberAccountID)
		_, _ = pool.Exec(bgCtx, `DELETE FROM accounts WHERE id = $1`, creatorAccountID)
	})

	tx, err := svc.Credit(ctx, householdID, CreditInput{
		MemberID:    memberID,
		AmountCents: 100,
		Kind:        "tip",
		Reason:      "good job",
	})
	require.NoError(t, err)
	assert.Equal(t, int64(100), tx.AmountCents)
	assert.Equal(t, "tip", tx.Kind)

	wallet, err := q.GetOrCreateWallet(ctx, memberID)
	require.NoError(t, err)
	assert.Equal(t, int64(100), wallet.BalanceCents)
}

func TestWalletService_Credit_Negative_DoesNotPanic(t *testing.T) {
	if testing.Short() {
		t.Skip("integration: requires TIDYBOARD_TEST_DSN")
	}

	pool := testutil.SetupTestDB(t)
	q := query.New(pool)
	bc := broadcast.NewMemoryBroadcaster()
	svc := NewWalletService(q, bc, nil)

	householdID := uuid.New()
	memberID := uuid.New()
	ctx := context.Background()
	creatorAccountID := uuid.New()

	_, err := pool.Exec(ctx,
		`INSERT INTO accounts (id, email, password_hash) VALUES ($1, $2, 'x') ON CONFLICT DO NOTHING`,
		creatorAccountID, creatorAccountID.String()+"@example.com",
	)
	require.NoError(t, err)

	_, err = pool.Exec(ctx,
		`INSERT INTO households (id, name, timezone, invite_code, created_by) VALUES ($1, 'Test2', 'UTC', 'WTEST2', $2)`,
		householdID, creatorAccountID,
	)
	require.NoError(t, err)

	memberAccountID := uuid.New()
	_, err = pool.Exec(ctx,
		`INSERT INTO accounts (id, email, password_hash) VALUES ($1, $2, 'x') ON CONFLICT DO NOTHING`,
		memberAccountID, memberAccountID.String()+"@example.com",
	)
	require.NoError(t, err)

	_, err = pool.Exec(ctx,
		`INSERT INTO members (id, household_id, account_id, name, display_name, role) VALUES ($1, $2, $3, 'Kid2', 'Kid2', 'child')`,
		memberID, householdID, memberAccountID,
	)
	require.NoError(t, err)

	t.Cleanup(func() {
		bgCtx := context.Background()
		_, _ = pool.Exec(bgCtx, `DELETE FROM wallet_transactions WHERE member_id = $1`, memberID)
		_, _ = pool.Exec(bgCtx, `DELETE FROM wallets WHERE member_id = $1`, memberID)
		_, _ = pool.Exec(bgCtx, `DELETE FROM members WHERE id = $1`, memberID)
		_, _ = pool.Exec(bgCtx, `DELETE FROM households WHERE id = $1`, householdID)
		_, _ = pool.Exec(bgCtx, `DELETE FROM accounts WHERE id = $1`, memberAccountID)
		_, _ = pool.Exec(bgCtx, `DELETE FROM accounts WHERE id = $1`, creatorAccountID)
	})

	tx, err := svc.Credit(ctx, householdID, CreditInput{
		MemberID:    memberID,
		AmountCents: -50,
		Kind:        "cash_out",
		Reason:      "paid in cash",
	})
	require.NoError(t, err)
	assert.Equal(t, int64(-50), tx.AmountCents)

	wallet, err := q.GetOrCreateWallet(ctx, memberID)
	require.NoError(t, err)
	assert.Equal(t, int64(-50), wallet.BalanceCents)
}

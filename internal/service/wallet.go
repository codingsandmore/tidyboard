package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/tidyboard/tidyboard/internal/broadcast"
	"github.com/tidyboard/tidyboard/internal/query"
)

// CreditInput carries all fields needed to write one ledger entry.
type CreditInput struct {
	MemberID           uuid.UUID
	AmountCents        int64
	Kind               string
	Reason             string
	ReferenceID        *uuid.UUID
	CreatedByAccountID *uuid.UUID
}

// WalletService handles atomic ledger writes for kid wallets.
type WalletService struct {
	q     *query.Queries
	bc    broadcast.Broadcaster
	audit *AuditService
}

// NewWalletService constructs a WalletService.
func NewWalletService(q *query.Queries, bc broadcast.Broadcaster, audit *AuditService) *WalletService {
	return &WalletService{q: q, bc: bc, audit: audit}
}

// GetWallet returns (or creates) the wallet for a member.
func (s *WalletService) GetWallet(ctx context.Context, memberID uuid.UUID) (query.Wallet, error) {
	return s.q.GetOrCreateWallet(ctx, memberID)
}

// ListTransactions returns paged transactions for a member's wallet.
func (s *WalletService) ListTransactions(ctx context.Context, memberID uuid.UUID, limit, offset int32) ([]query.WalletTransaction, error) {
	wallet, err := s.q.GetOrCreateWallet(ctx, memberID)
	if err != nil {
		return nil, fmt.Errorf("wallet.ListTransactions: get wallet: %w", err)
	}
	return s.q.ListWalletTransactions(ctx, query.ListWalletTransactionsParams{
		WalletID: wallet.ID,
		Limit:    limit,
		Offset:   offset,
	})
}

// Credit writes a signed ledger entry and adjusts the wallet balance atomically.
// Negative amounts are valid (cash_out, adjustment debit).
func (s *WalletService) Credit(ctx context.Context, householdID uuid.UUID, inp CreditInput) (query.WalletTransaction, error) {
	wallet, err := s.q.GetOrCreateWallet(ctx, inp.MemberID)
	if err != nil {
		return query.WalletTransaction{}, fmt.Errorf("wallet.Credit: get wallet: %w", err)
	}

	var refID *uuid.NullUUID
	if inp.ReferenceID != nil {
		refID = &uuid.NullUUID{UUID: *inp.ReferenceID, Valid: true}
	}

	var byAccountID *uuid.NullUUID
	if inp.CreatedByAccountID != nil {
		byAccountID = &uuid.NullUUID{UUID: *inp.CreatedByAccountID, Valid: true}
	}

	tx, err := s.q.CreateWalletTransaction(ctx, query.CreateWalletTransactionParams{
		ID:                 uuid.New(),
		WalletID:           wallet.ID,
		MemberID:           inp.MemberID,
		AmountCents:        inp.AmountCents,
		Kind:               inp.Kind,
		ReferenceID:        refID,
		Reason:             inp.Reason,
		CreatedByAccountID: byAccountID,
	})
	if err != nil {
		return query.WalletTransaction{}, fmt.Errorf("wallet.Credit: create transaction: %w", err)
	}

	if _, err := s.q.AdjustWalletBalance(ctx, query.AdjustWalletBalanceParams{
		MemberID:     inp.MemberID,
		BalanceCents: inp.AmountCents,
	}); err != nil {
		return query.WalletTransaction{}, fmt.Errorf("wallet.Credit: adjust balance: %w", err)
	}

	// Publish WebSocket event (best-effort — do not fail the write on broadcast error).
	if s.bc != nil {
		payload, _ := json.Marshal(map[string]any{
			"transaction_id": tx.ID,
			"member_id":      inp.MemberID,
			"amount_cents":   inp.AmountCents,
			"kind":           inp.Kind,
		})
		_ = s.bc.Publish(ctx, "household:"+householdID.String(), broadcast.Event{
			Type:        "wallet.transaction",
			HouseholdID: householdID.String(),
			Payload:     payload,
			Timestamp:   time.Now().UTC(),
		})
	}

	// Audit log (best-effort).
	if s.audit != nil {
		s.audit.Log(ctx, "wallet.credit", "wallet_transaction", tx.ID, map[string]any{
			"member_id":    inp.MemberID,
			"amount_cents": inp.AmountCents,
			"kind":         inp.Kind,
			"reason":       inp.Reason,
		})
	}

	return tx, nil
}

// Tip credits a positive tip from a parent/admin to a kid's wallet.
func (s *WalletService) Tip(ctx context.Context, householdID, memberID uuid.UUID, byAccountID *uuid.UUID, amountCents int64, reason string) (query.WalletTransaction, error) {
	if amountCents <= 0 {
		return query.WalletTransaction{}, errors.New("wallet.Tip: amount must be positive")
	}
	return s.Credit(ctx, householdID, CreditInput{
		MemberID:           memberID,
		AmountCents:        amountCents,
		Kind:               "tip",
		Reason:             reason,
		CreatedByAccountID: byAccountID,
	})
}

// CashOut debits the wallet (negative amount) when a kid is paid out.
func (s *WalletService) CashOut(ctx context.Context, householdID, memberID uuid.UUID, byAccountID *uuid.UUID, amountCents int64, method, note string) (query.WalletTransaction, error) {
	if amountCents <= 0 {
		return query.WalletTransaction{}, errors.New("wallet.CashOut: amount must be positive")
	}
	reason := method
	if note != "" {
		reason = method + ": " + note
	}
	return s.Credit(ctx, householdID, CreditInput{
		MemberID:           memberID,
		AmountCents:        -amountCents,
		Kind:               "cash_out",
		Reason:             reason,
		CreatedByAccountID: byAccountID,
	})
}

// Adjust applies an admin ± correction to the wallet balance.
func (s *WalletService) Adjust(ctx context.Context, householdID, memberID uuid.UUID, byAccountID *uuid.UUID, amountCents int64, reason string) (query.WalletTransaction, error) {
	if reason == "" {
		return query.WalletTransaction{}, errors.New("wallet.Adjust: reason is required")
	}
	return s.Credit(ctx, householdID, CreditInput{
		MemberID:           memberID,
		AmountCents:        amountCents,
		Kind:               "adjustment",
		Reason:             reason,
		CreatedByAccountID: byAccountID,
	})
}

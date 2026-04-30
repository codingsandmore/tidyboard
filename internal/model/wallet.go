package model

import (
	"time"

	"github.com/google/uuid"
)

// CreateTransactionRequest writes a signed amount to a wallet.
type CreateTransactionRequest struct {
	MemberID    uuid.UUID  `json:"member_id"    validate:"required"`
	AmountCents int64      `json:"amount_cents"  validate:"required"`
	Kind        string     `json:"kind"          validate:"required,oneof=chore_payout streak_bonus tip ad_hoc cash_out adjustment"`
	ReferenceID *uuid.UUID `json:"reference_id,omitempty"`
	Reason      string     `json:"reason"`
}

// TipRequest is what /v1/wallet/{id}/tip accepts.
type TipRequest struct {
	AmountCents int64  `json:"amount_cents" validate:"required,gt=0"`
	Reason      string `json:"reason"       validate:"required,min=1,max=200"`
}

// CashOutRequest is what /v1/wallet/{id}/cash-out accepts.
type CashOutRequest struct {
	AmountCents int64  `json:"amount_cents" validate:"required,gt=0"`
	Method      string `json:"method"` // "venmo" | "cash" | "other"
	Note        string `json:"note"`
}

// AdjustRequest is the admin-only ± override.
type AdjustRequest struct {
	AmountCents int64  `json:"amount_cents" validate:"required"`
	Reason      string `json:"reason"       validate:"required,min=1,max=200"`
}

// WalletWeekResponse is the breakdown shown on /wallet/{member_id}/week.
type WalletWeekResponse struct {
	WeekStart            time.Time              `json:"week_start"`
	EarnedCents          int64                  `json:"earned_cents"`
	StreakBonusCents     int64                  `json:"streak_bonus_cents"`
	PerChore             []WalletWeekChoreEntry `json:"per_chore"`
	TipsCents            int64                  `json:"tips_cents"`
	AdHocCents           int64                  `json:"ad_hoc_cents"`
	StartingBalanceCents int64                  `json:"starting_balance_cents"`
	EndingBalanceCents   int64                  `json:"ending_balance_cents"`
}

// WalletWeekChoreEntry is one row in WalletWeekResponse.PerChore.
type WalletWeekChoreEntry struct {
	ChoreID          uuid.UUID `json:"chore_id"`
	ChoreName        string    `json:"chore_name"`
	Completed        int       `json:"completed"`
	Possible         int       `json:"possible"`
	EarnedCents      int64     `json:"earned_cents"`
	StreakBonusCents int64     `json:"streak_bonus_cents"`
}

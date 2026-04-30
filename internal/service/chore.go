package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/tidyboard/tidyboard/internal/broadcast"
	"github.com/tidyboard/tidyboard/internal/query"
)

// ChoreCreateInput carries all fields needed to create a chore.
type ChoreCreateInput struct {
	MemberID      uuid.UUID
	Name          string
	Weight        int
	FrequencyKind string
	DaysOfWeek    []string
	AutoApprove   bool
}

// ChoreService handles chore CRUD and completion logic.
type ChoreService struct {
	q      *query.Queries
	wallet *WalletService
	bc     broadcast.Broadcaster
	audit  *AuditService
}

// NewChoreService constructs a ChoreService.
func NewChoreService(q *query.Queries, wallet *WalletService, bc broadcast.Broadcaster, audit *AuditService) *ChoreService {
	return &ChoreService{q: q, wallet: wallet, bc: bc, audit: audit}
}

// FrequencyPerWeek returns the number of expected completions per week for a given frequency kind.
func FrequencyPerWeek(kind string, days []string) int {
	switch kind {
	case "daily":
		return 7
	case "weekdays":
		return 5
	case "specific_days":
		return len(days)
	case "weekly":
		return 1
	default:
		return 0
	}
}

// Create inserts a new chore into the household.
func (s *ChoreService) Create(ctx context.Context, householdID uuid.UUID, inp ChoreCreateInput) (query.Chore, error) {
	daysOfWeek := inp.DaysOfWeek
	if daysOfWeek == nil {
		daysOfWeek = []string{}
	}

	chore, err := s.q.CreateChore(ctx, query.CreateChoreParams{
		ID:            uuid.New(),
		HouseholdID:   householdID,
		MemberID:      inp.MemberID,
		Name:          inp.Name,
		Weight:        int32(inp.Weight),
		FrequencyKind: inp.FrequencyKind,
		DaysOfWeek:    daysOfWeek,
		AutoApprove:   inp.AutoApprove,
	})
	if err != nil {
		return query.Chore{}, fmt.Errorf("chore.Create: %w", err)
	}
	return chore, nil
}

// Update patches mutable fields on an existing chore.
func (s *ChoreService) Update(ctx context.Context, householdID, choreID uuid.UUID, req query.UpdateChoreParams) (query.Chore, error) {
	req.ID = choreID
	req.HouseholdID = householdID
	chore, err := s.q.UpdateChore(ctx, req)
	if err != nil {
		return query.Chore{}, fmt.Errorf("chore.Update: %w", err)
	}
	return chore, nil
}

// Archive soft-deletes a chore.
func (s *ChoreService) Archive(ctx context.Context, householdID, choreID uuid.UUID) error {
	if err := s.q.ArchiveChore(ctx, query.ArchiveChoreParams{
		ID:          choreID,
		HouseholdID: householdID,
	}); err != nil {
		return fmt.Errorf("chore.Archive: %w", err)
	}
	return nil
}

// Complete records a chore completion for a given date and, if auto-approved,
// credits the member's wallet.
func (s *ChoreService) Complete(ctx context.Context, householdID, choreID uuid.UUID, date time.Time, byMember uuid.UUID) (query.ChoreCompletion, error) {
	// 1. Verify chore exists in household.
	chore, err := s.q.GetChore(ctx, query.GetChoreParams{
		ID:          choreID,
		HouseholdID: householdID,
	})
	if err != nil {
		return query.ChoreCompletion{}, fmt.Errorf("chore.Complete: get chore: %w", err)
	}

	// 2. Look up active allowance; treat missing as 0.
	var allowanceCents int64
	allowance, err := s.q.GetActiveAllowance(ctx, chore.MemberID)
	if err == nil {
		allowanceCents = allowance.AmountCents
	}

	// 3. List sibling chores for the same member (active only).
	memberFilter := &uuid.NullUUID{UUID: chore.MemberID, Valid: true}
	siblings, err := s.q.ListChores(ctx, query.ListChoresParams{
		HouseholdID:     householdID,
		MemberID:        memberFilter,
		IncludeArchived: false,
	})
	if err != nil {
		return query.ChoreCompletion{}, fmt.Errorf("chore.Complete: list chores: %w", err)
	}

	// 4. Compute payout.
	weights := make([]int, len(siblings))
	freqs := make([]int, len(siblings))
	for i, c := range siblings {
		weights[i] = int(c.Weight)
		freqs[i] = FrequencyPerWeek(c.FrequencyKind, c.DaysOfWeek)
	}
	divisor := WeeklyDivisor(weights, freqs)
	payout := PerInstancePayout(allowanceCents, int(chore.Weight), divisor)

	// 5. Insert completion (ON CONFLICT DO NOTHING).
	pgDate := pgtype.Date{Time: date.UTC().Truncate(24 * time.Hour), Valid: true}
	completion, err := s.q.CreateChoreCompletion(ctx, query.CreateChoreCompletionParams{
		ID:          uuid.New(),
		ChoreID:     choreID,
		MemberID:    chore.MemberID,
		Date:        pgDate,
		Approved:    chore.AutoApprove,
		PayoutCents: int32(payout),
	})
	if err != nil {
		// ON CONFLICT DO NOTHING returns pgx.ErrNoRows when the row already exists.
		if isNoRows(err) {
			existing, fetchErr := s.q.GetChoreCompletion(ctx, query.GetChoreCompletionParams{
				ChoreID: choreID,
				Date:    pgDate,
			})
			if fetchErr != nil {
				return query.ChoreCompletion{}, fmt.Errorf("chore.Complete: fetch existing completion: %w", fetchErr)
			}
			return existing, nil
		}
		return query.ChoreCompletion{}, fmt.Errorf("chore.Complete: create completion: %w", err)
	}

	// If CreateChoreCompletion returns a zero-ID it means ON CONFLICT DO NOTHING
	// fired (some drivers return an empty row rather than ErrNoRows).
	if completion.ID == (uuid.UUID{}) {
		existing, fetchErr := s.q.GetChoreCompletion(ctx, query.GetChoreCompletionParams{
			ChoreID: choreID,
			Date:    pgDate,
		})
		if fetchErr != nil {
			return query.ChoreCompletion{}, fmt.Errorf("chore.Complete: fetch existing completion (zero-id): %w", fetchErr)
		}
		return existing, nil
	}

	// 6. Credit wallet if auto-approved and payout > 0.
	if chore.AutoApprove && payout > 0 && s.wallet != nil {
		refID := completion.ID
		if _, credErr := s.wallet.Credit(ctx, householdID, CreditInput{
			MemberID:    chore.MemberID,
			AmountCents: payout,
			Kind:        "chore_payout",
			Reason:      chore.Name,
			ReferenceID: &refID,
		}); credErr != nil {
			return completion, fmt.Errorf("chore.Complete: credit wallet: %w", credErr)
		}
	}

	// 7. Publish WS event (best-effort).
	if s.bc != nil {
		payload, _ := json.Marshal(map[string]any{
			"chore_id":     choreID,
			"member_id":    chore.MemberID,
			"date":         date.UTC().Format("2006-01-02"),
			"payout_cents": payout,
		})
		_ = s.bc.Publish(ctx, "household:"+householdID.String(), broadcast.Event{
			Type:        "chore.completed",
			HouseholdID: householdID.String(),
			Payload:     payload,
			Timestamp:   time.Now().UTC(),
		})
	}

	return completion, nil
}

// Undo reverses a chore completion, debiting the wallet if a payout was made.
func (s *ChoreService) Undo(ctx context.Context, householdID, choreID uuid.UUID, date time.Time) error {
	pgDate := pgtype.Date{Time: date.UTC().Truncate(24 * time.Hour), Valid: true}

	// 1. Fetch the completion.
	completion, err := s.q.GetChoreCompletion(ctx, query.GetChoreCompletionParams{
		ChoreID: choreID,
		Date:    pgDate,
	})
	if err != nil {
		return fmt.Errorf("chore.Undo: get completion: %w", err)
	}

	// 2. Refuse if week is closed.
	if completion.Closed {
		return errors.New("chore.Undo: week is closed; cannot undo")
	}

	// 3. Reverse credit if a payout was recorded.
	if completion.PayoutCents > 0 && s.wallet != nil {
		refID := completion.ID
		if _, credErr := s.wallet.Credit(ctx, householdID, CreditInput{
			MemberID:    completion.MemberID,
			AmountCents: -int64(completion.PayoutCents),
			Kind:        "adjustment",
			Reason:      "undo chore completion",
			ReferenceID: &refID,
		}); credErr != nil {
			return fmt.Errorf("chore.Undo: reverse credit: %w", credErr)
		}
	}

	// 4. Delete the completion row.
	if err := s.q.DeleteChoreCompletion(ctx, query.DeleteChoreCompletionParams{
		ChoreID: choreID,
		Date:    pgDate,
	}); err != nil {
		return fmt.Errorf("chore.Undo: delete completion: %w", err)
	}

	return nil
}

// isNoRows returns true for both pgx.ErrNoRows and errors wrapping it, which
// CreateChoreCompletion (ON CONFLICT DO NOTHING :one) can return.
func isNoRows(err error) bool {
	if err == nil {
		return false
	}
	// pgx wraps this as "no rows in result set"
	return err.Error() == "no rows in result set"
}

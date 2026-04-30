// Package cron — scheduled jobs.
package cron

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/tidyboard/tidyboard/internal/query"
	"github.com/tidyboard/tidyboard/internal/service"
)

// WeekEndBatch closes the chore week — pays streak bonuses, marks completions
// immutable, snapshots the weekly summary.
type WeekEndBatch struct {
	Q  *query.Queries
	WS *service.WalletService
}

// Run processes the most recently completed week for every member in every
// household. For single-tenant Path C installs, call RunForHousehold directly.
// Multi-tenant support (q.ListAllHouseholds) is deferred until needed.
func (b WeekEndBatch) Run(ctx context.Context) error {
	// TODO(multi-tenant): replace with q.ListAllHouseholds() when available.
	// For Path C (single household per install) the caller should use
	// RunForHousehold with the household ID sourced from config.
	return nil
}

// RunForHousehold processes the most recently completed week for every member
// of the given household. This is the callable unit used by the cron schedule
// and by integration tests.
func (b WeekEndBatch) RunForHousehold(ctx context.Context, householdID uuid.UUID) error {
	weekStart, weekEnd := lastFullWeek(time.Now().UTC())
	members, err := b.Q.ListMembersInHousehold(ctx, householdID)
	if err != nil {
		return fmt.Errorf("week_end_batch: list members: %w", err)
	}
	for _, memberID := range members {
		if err := b.processMemberWeek(ctx, householdID, memberID, weekStart, weekEnd); err != nil {
			return fmt.Errorf("week_end_batch: process member %s: %w", memberID, err)
		}
	}
	return nil
}

func (b WeekEndBatch) processMemberWeek(ctx context.Context, householdID, memberID uuid.UUID, weekStart, weekEnd time.Time) error {
	chores, err := b.Q.ListChores(ctx, query.ListChoresParams{
		HouseholdID:     householdID,
		MemberID:        &uuid.NullUUID{UUID: memberID, Valid: true},
		IncludeArchived: false,
	})
	if err != nil {
		return fmt.Errorf("list chores: %w", err)
	}

	completions, err := b.Q.ListChoreCompletionsForWeek(ctx, query.ListChoreCompletionsForWeekParams{
		MemberID: memberID,
		Date:     pgtype.Date{Time: weekStart, Valid: true},
		Date_2:   pgtype.Date{Time: weekEnd, Valid: true},
	})
	if err != nil {
		return fmt.Errorf("list completions: %w", err)
	}

	byChore := make(map[uuid.UUID][]query.ChoreCompletion, len(chores))
	for _, c := range completions {
		byChore[c.ChoreID] = append(byChore[c.ChoreID], c)
	}

	var totalEarned, totalBonus int64
	var completedCount, possibleCount int
	for _, chore := range chores {
		freq := service.FrequencyPerWeek(chore.FrequencyKind, chore.DaysOfWeek)
		possibleCount += freq
		done := byChore[chore.ID]
		completedCount += len(done)

		var weekTotal int64
		for _, c := range done {
			weekTotal += int64(c.PayoutCents)
		}
		totalEarned += weekTotal

		if freq > 0 && len(done) >= freq {
			bonus := service.StreakBonus(weekTotal)
			if bonus > 0 {
				ref := chore.ID
				if _, err := b.WS.Credit(ctx, householdID, service.CreditInput{
					MemberID:    memberID,
					AmountCents: bonus,
					Kind:        "streak_bonus",
					Reason:      "100% streak: " + chore.Name,
					ReferenceID: &ref,
				}); err != nil {
					return fmt.Errorf("credit streak bonus for chore %s: %w", chore.ID, err)
				}
				totalBonus += bonus
			}
		}
	}

	if err := b.Q.CloseChoreCompletionsForWeek(ctx, query.CloseChoreCompletionsForWeekParams{
		MemberID: memberID,
		Date:     pgtype.Date{Time: weekStart, Valid: true},
		Date_2:   pgtype.Date{Time: weekEnd, Valid: true},
	}); err != nil {
		return fmt.Errorf("close completions: %w", err)
	}

	if _, err := b.Q.UpsertWeeklySummary(ctx, query.UpsertWeeklySummaryParams{
		HouseholdID:      householdID,
		MemberID:         memberID,
		WeekStart:        pgtype.Date{Time: weekStart, Valid: true},
		EarnedCents:      totalEarned,
		StreakBonusCents: totalBonus,
		ChoresCompleted:  int32(completedCount),
		ChoresPossible:   int32(possibleCount),
	}); err != nil {
		return fmt.Errorf("upsert weekly summary: %w", err)
	}

	return nil
}

// lastFullWeek returns the Sunday→Saturday of the week before today (UTC).
func lastFullWeek(now time.Time) (time.Time, time.Time) {
	today := now.Truncate(24 * time.Hour)
	dow := int(today.Weekday()) // Sunday=0
	thisSunday := today.AddDate(0, 0, -dow)
	lastSunday := thisSunday.AddDate(0, 0, -7)
	lastSaturday := thisSunday.AddDate(0, 0, -1)
	return lastSunday, lastSaturday
}

package service

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/tidyboard/tidyboard/internal/query"
)

// ErrTimerAlreadyRunning indicates a Start was attempted while another timer
// is open for the same (chore, member). The handler maps this to HTTP 409
// with code "timer_already_running".
var ErrTimerAlreadyRunning = errors.New("chore_timer: a timer is already running for this chore and member")

// ErrNoOpenTimer indicates Stop was called for a (chore, member) that has no
// open timer. The handler maps this to HTTP 409 with code "no_open_timer".
var ErrNoOpenTimer = errors.New("chore_timer: no open timer for this chore and member")

// ChoreTimerService handles timer start/stop, manual time entries, and
// member time summaries. The service is intentionally separate from
// ChoreService so the two can evolve independently.
type ChoreTimerService struct {
	q *query.Queries
}

// NewChoreTimerService constructs a ChoreTimerService.
func NewChoreTimerService(q *query.Queries) *ChoreTimerService {
	return &ChoreTimerService{q: q}
}

// Start opens a new timer entry. Returns ErrTimerAlreadyRunning if there is
// already an open entry for (choreID, memberID).
func (s *ChoreTimerService) Start(ctx context.Context, choreID, memberID uuid.UUID) (query.ChoreTimeEntry, error) {
	entry, err := s.q.StartChoreTimer(ctx, query.StartChoreTimerParams{
		ID:       uuid.New(),
		ChoreID:  choreID,
		MemberID: memberID,
	})
	if err != nil {
		var pgErr *pgconn.PgError
		// 23505 == unique_violation per PostgreSQL SQLSTATE.
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return query.ChoreTimeEntry{}, ErrTimerAlreadyRunning
		}
		return query.ChoreTimeEntry{}, fmt.Errorf("chore_timer.Start: %w", err)
	}
	return entry, nil
}

// Stop closes the latest open entry for (choreID, memberID). The ended_at
// timestamp is set server-side. Returns ErrNoOpenTimer if there is no open
// entry to close.
func (s *ChoreTimerService) Stop(ctx context.Context, choreID, memberID uuid.UUID) (query.ChoreTimeEntry, error) {
	entry, err := s.q.StopChoreTimer(ctx, query.StopChoreTimerParams{
		ChoreID:  choreID,
		MemberID: memberID,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return query.ChoreTimeEntry{}, ErrNoOpenTimer
		}
		return query.ChoreTimeEntry{}, fmt.Errorf("chore_timer.Stop: %w", err)
	}
	return entry, nil
}

// ManualEntryInput carries fields for inserting a manual time entry.
type ManualEntryInput struct {
	ChoreID   uuid.UUID
	MemberID  uuid.UUID
	StartedAt time.Time
	EndedAt   time.Time
	Note      string
}

// RecordManualEntry inserts a closed time entry with both endpoints supplied
// by the caller. Validates startedAt < endedAt.
func (s *ChoreTimerService) RecordManualEntry(ctx context.Context, in ManualEntryInput) (query.ChoreTimeEntry, error) {
	if !in.StartedAt.Before(in.EndedAt) {
		return query.ChoreTimeEntry{}, errors.New("chore_timer.RecordManualEntry: started_at must be before ended_at")
	}
	entry, err := s.q.InsertManualTimeEntry(ctx, query.InsertManualTimeEntryParams{
		ID:        uuid.New(),
		ChoreID:   in.ChoreID,
		MemberID:  in.MemberID,
		StartedAt: pgtype.Timestamptz{Time: in.StartedAt.UTC(), Valid: true},
		EndedAt:   pgtype.Timestamptz{Time: in.EndedAt.UTC(), Valid: true},
		Note:      in.Note,
	})
	if err != nil {
		return query.ChoreTimeEntry{}, fmt.Errorf("chore_timer.RecordManualEntry: %w", err)
	}
	return entry, nil
}

// MemberSummary is the aggregate returned by GET /v1/members/{id}/time-summary.
type MemberSummary struct {
	MemberID     uuid.UUID                `json:"member_id"`
	From         time.Time                `json:"from"`
	To           time.Time                `json:"to"`
	EntryCount   int64                    `json:"entry_count"`
	TotalSeconds int64                    `json:"total_seconds"`
	ByChore      []MemberSummaryByChore   `json:"by_chore"`
}

// MemberSummaryByChore is one row of per-chore breakdown.
type MemberSummaryByChore struct {
	ChoreID      uuid.UUID `json:"chore_id"`
	EntryCount   int64     `json:"entry_count"`
	TotalSeconds int64     `json:"total_seconds"`
}

// Summary aggregates closed time entries for a member over [from, to).
func (s *ChoreTimerService) Summary(ctx context.Context, memberID uuid.UUID, from, to time.Time) (MemberSummary, error) {
	fromTS := pgtype.Timestamptz{Time: from.UTC(), Valid: true}
	toTS := pgtype.Timestamptz{Time: to.UTC(), Valid: true}

	row, err := s.q.GetMemberTimeSummary(ctx, query.GetMemberTimeSummaryParams{
		MemberID:    memberID,
		StartedAt:   fromTS,
		StartedAt_2: toTS,
	})
	if err != nil {
		return MemberSummary{}, fmt.Errorf("chore_timer.Summary: %w", err)
	}

	byChoreRows, err := s.q.GetMemberTimeSummaryByChore(ctx, query.GetMemberTimeSummaryByChoreParams{
		MemberID:    memberID,
		StartedAt:   fromTS,
		StartedAt_2: toTS,
	})
	if err != nil {
		return MemberSummary{}, fmt.Errorf("chore_timer.Summary: by-chore: %w", err)
	}

	byChore := make([]MemberSummaryByChore, len(byChoreRows))
	for i, r := range byChoreRows {
		byChore[i] = MemberSummaryByChore{
			ChoreID:      r.ChoreID,
			EntryCount:   r.EntryCount,
			TotalSeconds: r.TotalSeconds,
		}
	}

	return MemberSummary{
		MemberID:     memberID,
		From:         from.UTC(),
		To:           to.UTC(),
		EntryCount:   row.EntryCount,
		TotalSeconds: row.TotalSeconds,
		ByChore:      byChore,
	}, nil
}

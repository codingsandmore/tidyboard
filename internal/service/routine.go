package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/tidyboard/tidyboard/internal/broadcast"
	"github.com/tidyboard/tidyboard/internal/model"
	"github.com/tidyboard/tidyboard/internal/query"
)

// RoutineService handles routine business logic.
type RoutineService struct {
	q      *query.Queries
	bc     broadcast.Broadcaster
	audit  *AuditService
	notify *NotifyService
}

// NewRoutineService constructs a RoutineService.
func NewRoutineService(q *query.Queries, bc broadcast.Broadcaster, audit *AuditService) *RoutineService {
	return &RoutineService{q: q, bc: bc, audit: audit}
}

// WithNotify attaches a NotifyService so completions can trigger push notifications.
func (s *RoutineService) WithNotify(n *NotifyService) *RoutineService {
	s.notify = n
	return s
}

// publish emits a broadcast event for the household channel (non-blocking).
func (s *RoutineService) publish(ctx context.Context, householdID uuid.UUID, eventType string, payload any) {
	if s.bc == nil {
		return
	}
	data, err := json.Marshal(payload)
	if err != nil {
		return
	}
	ev := broadcast.Event{
		Type:        eventType,
		HouseholdID: householdID.String(),
		Payload:     data,
		Timestamp:   time.Now().UTC(),
	}
	go func() {
		_ = s.bc.Publish(context.Background(), "household:"+householdID.String(), ev)
	}()
}

// List returns routines for a household, optionally filtered.
func (s *RoutineService) List(ctx context.Context, householdID uuid.UUID, memberID *uuid.UUID, timeSlot *string) ([]*model.Routine, error) {
	var memberParam *uuid.NullUUID
	if memberID != nil {
		memberParam = &uuid.NullUUID{UUID: *memberID, Valid: true}
	}
	rows, err := s.q.ListRoutines(ctx, query.ListRoutinesParams{
		HouseholdID: householdID,
		MemberID:    memberParam,
		TimeSlot:    timeSlot,
	})
	if err != nil {
		return nil, fmt.Errorf("listing routines: %w", err)
	}
	out := make([]*model.Routine, len(rows))
	for i, r := range rows {
		out[i] = routineToModel(r)
		steps, err := s.q.ListSteps(ctx, r.ID)
		if err != nil {
			return nil, fmt.Errorf("listing steps for routine %s: %w", r.ID, err)
		}
		for _, step := range steps {
			out[i].Steps = append(out[i].Steps, stepToModel(step))
		}
	}
	return out, nil
}

// Create inserts a new routine.
func (s *RoutineService) Create(ctx context.Context, householdID uuid.UUID, req model.CreateRoutineRequest) (*model.Routine, error) {
	var memberParam *uuid.NullUUID
	if req.MemberID != nil {
		memberParam = &uuid.NullUUID{UUID: *req.MemberID, Valid: true}
	}
	timeSlot := req.TimeSlot
	if timeSlot == "" {
		timeSlot = "anytime"
	}
	r, err := s.q.CreateRoutine(ctx, query.CreateRoutineParams{
		ID:          uuid.New(),
		HouseholdID: householdID,
		Name:        req.Name,
		MemberID:    memberParam,
		DaysOfWeek:  req.DaysOfWeek,
		TimeSlot:    timeSlot,
		Archived:    false,
		SortOrder:   int32(req.SortOrder),
	})
	if err != nil {
		return nil, fmt.Errorf("creating routine: %w", err)
	}
	out := routineToModel(r)
	s.publish(ctx, householdID, "routine.created", out)
	if s.audit != nil {
		s.audit.Log(ctx, "routine.create", "routine", out.ID, out)
	}
	return out, nil
}

// Get returns a single routine with its steps.
func (s *RoutineService) Get(ctx context.Context, householdID, routineID uuid.UUID) (*model.Routine, error) {
	r, err := s.q.GetRoutine(ctx, query.GetRoutineParams{ID: routineID, HouseholdID: householdID})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("fetching routine: %w", err)
	}
	out := routineToModel(r)
	steps, err := s.q.ListSteps(ctx, r.ID)
	if err != nil {
		return nil, fmt.Errorf("listing steps: %w", err)
	}
	for _, step := range steps {
		out.Steps = append(out.Steps, stepToModel(step))
	}
	return out, nil
}

// Update patches routine fields.
func (s *RoutineService) Update(ctx context.Context, householdID, routineID uuid.UUID, req model.UpdateRoutineRequest) (*model.Routine, error) {
	var memberParam *uuid.NullUUID
	if req.MemberID != nil {
		memberParam = &uuid.NullUUID{UUID: *req.MemberID, Valid: true}
	}
	var sortOrder *int32
	if req.SortOrder != nil {
		v := int32(*req.SortOrder)
		sortOrder = &v
	}
	r, err := s.q.UpdateRoutine(ctx, query.UpdateRoutineParams{
		ID:          routineID,
		HouseholdID: householdID,
		Name:        req.Name,
		MemberID:    memberParam,
		DaysOfWeek:  req.DaysOfWeek,
		TimeSlot:    req.TimeSlot,
		Archived:    req.Archived,
		SortOrder:   sortOrder,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("updating routine: %w", err)
	}
	out := routineToModel(r)
	s.publish(ctx, householdID, "routine.updated", out)
	if s.audit != nil {
		s.audit.Log(ctx, "routine.update", "routine", out.ID, out)
	}
	return out, nil
}

// Delete removes a routine.
func (s *RoutineService) Delete(ctx context.Context, householdID, routineID uuid.UUID) error {
	if _, err := s.q.GetRoutine(ctx, query.GetRoutineParams{ID: routineID, HouseholdID: householdID}); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrNotFound
		}
		return fmt.Errorf("fetching routine: %w", err)
	}
	if err := s.q.DeleteRoutine(ctx, query.DeleteRoutineParams{ID: routineID, HouseholdID: householdID}); err != nil {
		return fmt.Errorf("deleting routine: %w", err)
	}
	s.publish(ctx, householdID, "routine.deleted", map[string]string{"id": routineID.String()})
	if s.audit != nil {
		s.audit.Log(ctx, "routine.delete", "routine", routineID, map[string]string{"id": routineID.String()})
	}
	return nil
}

// AddStep inserts a step into a routine.
func (s *RoutineService) AddStep(ctx context.Context, householdID, routineID uuid.UUID, req model.AddStepRequest) (model.Step, error) {
	// verify routine belongs to household
	if _, err := s.q.GetRoutine(ctx, query.GetRoutineParams{ID: routineID, HouseholdID: householdID}); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return model.Step{}, ErrNotFound
		}
		return model.Step{}, fmt.Errorf("fetching routine: %w", err)
	}
	var estMin *int32
	if req.EstMinutes != nil {
		v := int32(*req.EstMinutes)
		estMin = &v
	}
	step, err := s.q.AddStep(ctx, query.AddStepParams{
		ID:         uuid.New(),
		RoutineID:  routineID,
		Name:       req.Name,
		EstMinutes: estMin,
		SortOrder:  int32(req.SortOrder),
		Icon:       req.Icon,
	})
	if err != nil {
		return model.Step{}, fmt.Errorf("adding step: %w", err)
	}
	out := stepToModel(step)
	s.publish(ctx, householdID, "routine.step.added", out)
	return out, nil
}

// UpdateStep patches a step.
func (s *RoutineService) UpdateStep(ctx context.Context, householdID, routineID, stepID uuid.UUID, req model.UpdateStepRequest) (model.Step, error) {
	// verify step belongs to household via routine
	if _, err := s.q.GetStep(ctx, query.GetStepParams{ID: stepID, HouseholdID: householdID}); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return model.Step{}, ErrNotFound
		}
		return model.Step{}, fmt.Errorf("fetching step: %w", err)
	}
	var estMin *int32
	if req.EstMinutes != nil {
		v := int32(*req.EstMinutes)
		estMin = &v
	}
	var sortOrder *int32
	if req.SortOrder != nil {
		v := int32(*req.SortOrder)
		sortOrder = &v
	}
	step, err := s.q.UpdateStep(ctx, query.UpdateStepParams{
		ID:         stepID,
		Name:       req.Name,
		EstMinutes: estMin,
		SortOrder:  sortOrder,
		Icon:       req.Icon,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return model.Step{}, ErrNotFound
		}
		return model.Step{}, fmt.Errorf("updating step: %w", err)
	}
	out := stepToModel(step)
	s.publish(ctx, householdID, "routine.step.updated", out)
	return out, nil
}

// DeleteStep removes a step from a routine.
func (s *RoutineService) DeleteStep(ctx context.Context, householdID, routineID, stepID uuid.UUID) error {
	if _, err := s.q.GetStep(ctx, query.GetStepParams{ID: stepID, HouseholdID: householdID}); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrNotFound
		}
		return fmt.Errorf("fetching step: %w", err)
	}
	if err := s.q.DeleteStep(ctx, stepID); err != nil {
		return fmt.Errorf("deleting step: %w", err)
	}
	s.publish(ctx, householdID, "routine.step.deleted", map[string]string{"id": stepID.String(), "routine_id": routineID.String()})
	return nil
}

// MarkComplete records a step completion (stepID=nil means whole-routine).
func (s *RoutineService) MarkComplete(ctx context.Context, householdID, routineID uuid.UUID, req model.MarkCompleteRequest) (*model.Completion, error) {
	// verify routine belongs to household
	if _, err := s.q.GetRoutine(ctx, query.GetRoutineParams{ID: routineID, HouseholdID: householdID}); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("fetching routine: %w", err)
	}

	var comp query.RoutineCompletion
	var err error

	if req.StepID != nil {
		comp, err = s.q.MarkStepComplete(ctx, query.MarkStepCompleteParams{
			ID:        uuid.New(),
			RoutineID: routineID,
			StepID:    &uuid.NullUUID{UUID: *req.StepID, Valid: true},
			MemberID:  req.MemberID,
		})
	} else {
		comp, err = s.q.MarkRoutineComplete(ctx, query.MarkRoutineCompleteParams{
			ID:        uuid.New(),
			RoutineID: routineID,
			MemberID:  req.MemberID,
		})
	}
	if err != nil {
		return nil, fmt.Errorf("marking completion: %w", err)
	}
	out := completionToModel(comp)

	// Broadcast appropriate event.
	eventType := "routine.completed"
	if req.StepID != nil {
		eventType = "routine.step.completed"
	}
	s.publish(ctx, householdID, eventType, out)
	if s.audit != nil {
		s.audit.Log(ctx, eventType, "routine_completion", out.ID, out)
	}
	if s.notify != nil {
		go s.notify.Notify(context.Background(), householdID, eventType,
			"Routine update", fmt.Sprintf("Member completed a routine step"))
	}
	return out, nil
}

// UnmarkCompletion deletes a completion record.
func (s *RoutineService) UnmarkCompletion(ctx context.Context, householdID, routineID, completionID uuid.UUID) error {
	// verify routine belongs to household first
	if _, err := s.q.GetRoutine(ctx, query.GetRoutineParams{ID: routineID, HouseholdID: householdID}); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrNotFound
		}
		return fmt.Errorf("fetching routine: %w", err)
	}
	if err := s.q.UnmarkCompletion(ctx, completionID); err != nil {
		return fmt.Errorf("deleting completion: %w", err)
	}
	s.publish(ctx, householdID, "routine.completion.deleted", map[string]string{"id": completionID.String()})
	return nil
}

// ListCompletionsForDay returns all completions for a household on a given date.
func (s *RoutineService) ListCompletionsForDay(ctx context.Context, householdID uuid.UUID, date time.Time, memberID *uuid.UUID) ([]*model.Completion, error) {
	var memberParam *uuid.NullUUID
	if memberID != nil {
		memberParam = &uuid.NullUUID{UUID: *memberID, Valid: true}
	}
	rows, err := s.q.ListCompletionsForDay(ctx, query.ListCompletionsForDayParams{
		HouseholdID: householdID,
		CompletedAt: pgtype.Timestamptz{Time: date, Valid: true},
		MemberID:    memberParam,
	})
	if err != nil {
		return nil, fmt.Errorf("listing completions: %w", err)
	}
	out := make([]*model.Completion, len(rows))
	for i, c := range rows {
		out[i] = completionToModel(c)
	}
	return out, nil
}

// GetStreak calculates consecutive days where the member completed all steps
// of the routine. Looks back up to 90 days.
func (s *RoutineService) GetStreak(ctx context.Context, householdID, routineID, memberID uuid.UUID) (int, error) {
	// verify ownership
	if _, err := s.q.GetRoutine(ctx, query.GetRoutineParams{ID: routineID, HouseholdID: householdID}); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return 0, ErrNotFound
		}
		return 0, fmt.Errorf("fetching routine: %w", err)
	}

	totalSteps, err := s.q.CountStepsForRoutine(ctx, routineID)
	if err != nil {
		return 0, fmt.Errorf("counting steps: %w", err)
	}
	// A routine with no steps can't have a streak.
	if totalSteps == 0 {
		return 0, nil
	}

	since := time.Now().UTC().AddDate(0, 0, -90)
	rows, err := s.q.GetDailyCompletionCounts(ctx, query.GetDailyCompletionCountsParams{
		RoutineID:   routineID,
		MemberID:    memberID,
		CompletedAt: pgtype.Timestamptz{Time: since, Valid: true},
	})
	if err != nil {
		return 0, fmt.Errorf("fetching completion counts: %w", err)
	}

	// Build a set of fully-completed days.
	completedDays := make(map[string]bool)
	for _, row := range rows {
		if row.Day.Valid && row.CompletionCount >= totalSteps {
			completedDays[row.Day.Time.Format("2006-01-02")] = true
		}
	}

	// Count consecutive days ending today (or yesterday if today isn't done yet).
	streak := 0
	today := time.Now().UTC()
	for d := 0; d < 90; d++ {
		day := today.AddDate(0, 0, -d).Format("2006-01-02")
		if completedDays[day] {
			streak++
		} else {
			break
		}
	}
	return streak, nil
}

// ─── converters ──────────────────────────────────────────────────────────────

func routineToModel(r query.Routine) *model.Routine {
	out := &model.Routine{
		ID:          r.ID,
		HouseholdID: r.HouseholdID,
		Name:        r.Name,
		DaysOfWeek:  r.DaysOfWeek,
		TimeSlot:    r.TimeSlot,
		Archived:    r.Archived,
		SortOrder:   int(r.SortOrder),
	}
	if r.MemberID != nil && r.MemberID.Valid {
		id := r.MemberID.UUID
		out.MemberID = &id
	}
	if r.CreatedAt.Valid {
		out.CreatedAt = r.CreatedAt.Time
	}
	if r.UpdatedAt.Valid {
		out.UpdatedAt = r.UpdatedAt.Time
	}
	if out.DaysOfWeek == nil {
		out.DaysOfWeek = []string{}
	}
	return out
}

func stepToModel(s query.RoutineStep) model.Step {
	out := model.Step{
		ID:        s.ID,
		RoutineID: s.RoutineID,
		Name:      s.Name,
		SortOrder: int(s.SortOrder),
		Icon:      s.Icon,
	}
	if s.EstMinutes != nil {
		v := int(*s.EstMinutes)
		out.EstMinutes = &v
	}
	if s.CreatedAt.Valid {
		out.CreatedAt = s.CreatedAt.Time
	}
	if s.UpdatedAt.Valid {
		out.UpdatedAt = s.UpdatedAt.Time
	}
	return out
}

func completionToModel(c query.RoutineCompletion) *model.Completion {
	out := &model.Completion{
		ID:        c.ID,
		RoutineID: c.RoutineID,
		MemberID:  c.MemberID,
	}
	if c.StepID != nil && c.StepID.Valid {
		id := c.StepID.UUID
		out.StepID = &id
	}
	if c.CompletedAt.Valid {
		out.CompletedAt = c.CompletedAt.Time
	}
	return out
}

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

// EventService handles calendar event business logic.
type EventService struct {
	q     *query.Queries
	bc    broadcast.Broadcaster
	audit *AuditService
}

// NewEventService constructs an EventService.
func NewEventService(q *query.Queries, bc broadcast.Broadcaster, audit *AuditService) *EventService {
	return &EventService{q: q, bc: bc, audit: audit}
}

// publish emits a broadcast event for the household channel (non-blocking).
func (s *EventService) publish(ctx context.Context, householdID uuid.UUID, eventType string, payload any) {
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

// ListInRange returns events for a household within [start, end].
// If start/end are zero, returns all events.
func (s *EventService) ListInRange(ctx context.Context, householdID uuid.UUID, start, end time.Time) ([]*model.Event, error) {
	arg := query.ListEventsInRangeParams{
		HouseholdID: householdID,
	}
	if !start.IsZero() {
		arg.StartTime = pgtype.Timestamptz{Time: start, Valid: true}
	}
	if !end.IsZero() {
		arg.EndTime = pgtype.Timestamptz{Time: end, Valid: true}
	}

	rows, err := s.q.ListEventsInRange(ctx, arg)
	if err != nil {
		return nil, fmt.Errorf("listing events: %w", err)
	}
	out := make([]*model.Event, len(rows))
	for i, r := range rows {
		out[i] = eventToModel(r)
	}
	return out, nil
}

// Create inserts a new event.
func (s *EventService) Create(ctx context.Context, householdID uuid.UUID, req model.CreateEventRequest) (*model.Event, error) {
	var calID *uuid.NullUUID
	if req.CalendarID != nil {
		calID = &uuid.NullUUID{UUID: *req.CalendarID, Valid: true}
	}

	e, err := s.q.CreateEvent(ctx, query.CreateEventParams{
		ID:              uuid.New(),
		HouseholdID:     householdID,
		CalendarID:      calID,
		Title:           req.Title,
		Description:     req.Description,
		StartTime:       pgtype.Timestamptz{Time: req.StartTime, Valid: true},
		EndTime:         pgtype.Timestamptz{Time: req.EndTime, Valid: true},
		AllDay:          req.AllDay,
		Location:        req.Location,
		RecurrenceRule:  req.RecurrenceRule,
		AssignedMembers: req.AssignedMembers,
		Reminders:       []byte("[]"),
	})
	if err != nil {
		return nil, fmt.Errorf("creating event: %w", err)
	}
	out := eventToModel(e)
	s.publish(ctx, householdID, "event.created", out)
	if s.audit != nil {
		s.audit.Log(ctx, "event.create", "event", out.ID, out)
	}
	return out, nil
}

// Get returns a single event, scoped to the household.
func (s *EventService) Get(ctx context.Context, householdID, eventID uuid.UUID) (*model.Event, error) {
	e, err := s.q.GetEvent(ctx, query.GetEventParams{
		ID:          eventID,
		HouseholdID: householdID,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("fetching event: %w", err)
	}
	return eventToModel(e), nil
}

// Update patches event fields.
func (s *EventService) Update(ctx context.Context, householdID, eventID uuid.UUID, req model.UpdateEventRequest) (*model.Event, error) {
	arg := query.UpdateEventParams{
		ID:              eventID,
		HouseholdID:     householdID,
		Title:           req.Title,
		Description:     req.Description,
		AllDay:          req.AllDay,
		Location:        req.Location,
		RecurrenceRule:  req.RecurrenceRule,
		AssignedMembers: req.AssignedMembers,
	}
	if req.StartTime != nil {
		arg.StartTime = pgtype.Timestamptz{Time: *req.StartTime, Valid: true}
	}
	if req.EndTime != nil {
		arg.EndTime = pgtype.Timestamptz{Time: *req.EndTime, Valid: true}
	}

	e, err := s.q.UpdateEvent(ctx, arg)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("updating event: %w", err)
	}
	out := eventToModel(e)
	s.publish(ctx, householdID, "event.updated", out)
	if s.audit != nil {
		s.audit.Log(ctx, "event.update", "event", out.ID, out)
	}
	return out, nil
}

// Delete removes an event.
func (s *EventService) Delete(ctx context.Context, householdID, eventID uuid.UUID) error {
	if _, err := s.q.GetEvent(ctx, query.GetEventParams{ID: eventID, HouseholdID: householdID}); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrNotFound
		}
		return fmt.Errorf("fetching event: %w", err)
	}
	if err := s.q.DeleteEvent(ctx, query.DeleteEventParams{
		ID:          eventID,
		HouseholdID: householdID,
	}); err != nil {
		return fmt.Errorf("deleting event: %w", err)
	}
	s.publish(ctx, householdID, "event.deleted", map[string]string{"id": eventID.String()})
	if s.audit != nil {
		s.audit.Log(ctx, "event.delete", "event", eventID, map[string]string{"id": eventID.String()})
	}
	return nil
}

// eventToModel converts a query.Event to model.Event.
func eventToModel(e query.Event) *model.Event {
	out := &model.Event{
		ID:              e.ID,
		HouseholdID:     e.HouseholdID,
		ExternalID:      e.ExternalID,
		Title:           e.Title,
		Description:     e.Description,
		AllDay:          e.AllDay,
		Location:        e.Location,
		RecurrenceRule:  e.RecurrenceRule,
		AssignedMembers: e.AssignedMembers,
		Reminders:       e.Reminders,
	}
	if e.CalendarID != nil && e.CalendarID.Valid {
		id := e.CalendarID.UUID
		out.CalendarID = &id
	}
	if e.StartTime.Valid {
		out.StartTime = e.StartTime.Time
	}
	if e.EndTime.Valid {
		out.EndTime = e.EndTime.Time
	}
	if e.CreatedAt.Valid {
		out.CreatedAt = e.CreatedAt.Time
	}
	if e.UpdatedAt.Valid {
		out.UpdatedAt = e.UpdatedAt.Time
	}
	return out
}

package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	rrule "github.com/teambition/rrule-go"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/tidyboard/tidyboard/internal/broadcast"
	"github.com/tidyboard/tidyboard/internal/model"
	"github.com/tidyboard/tidyboard/internal/query"
)

// EventService handles calendar event business logic.
type EventService struct {
	q      *query.Queries
	bc     broadcast.Broadcaster
	audit  *AuditService
	notify *NotifyService
}

// NewEventService constructs an EventService.
func NewEventService(q *query.Queries, bc broadcast.Broadcaster, audit *AuditService) *EventService {
	return &EventService{q: q, bc: bc, audit: audit}
}

// WithNotify attaches a NotifyService so event creates trigger push notifications.
func (s *EventService) WithNotify(n *NotifyService) *EventService {
	s.notify = n
	return s
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
// If start/end are zero, returns all events. If memberID is non-nil, only
// events where assigned_members contains that member are returned.
// Events with a recurrence_rule are expanded to all occurrences within
// [start, end]; each synthetic occurrence has ID "<base>:<date>".
func (s *EventService) ListInRange(ctx context.Context, householdID uuid.UUID, start, end time.Time, memberID *uuid.UUID) ([]*model.Event, error) {
	arg := query.ListEventsInRangeParams{
		HouseholdID: householdID,
	}
	if !start.IsZero() {
		arg.StartTime = pgtype.Timestamptz{Time: start, Valid: true}
	}
	if !end.IsZero() {
		arg.EndTime = pgtype.Timestamptz{Time: end, Valid: true}
	}
	if memberID != nil {
		arg.MemberID = &uuid.NullUUID{UUID: *memberID, Valid: true}
	}

	rows, err := s.q.ListEventsInRange(ctx, arg)
	if err != nil {
		return nil, fmt.Errorf("listing events: %w", err)
	}

	var out []*model.Event
	for _, r := range rows {
		base := eventToModel(r)
		if base.RecurrenceRule == "" || start.IsZero() || end.IsZero() {
			out = append(out, base)
			continue
		}
		// Expand RRULE occurrences within [start, end].
		occurrences, err := ExpandRRule(base, start, end)
		if err != nil {
			// If RRULE is unparseable, fall back to the base event.
			out = append(out, base)
			continue
		}
		out = append(out, occurrences...)
	}
	return out, nil
}

// ExpandRRule returns synthetic event instances for each RRULE occurrence of
// base within [windowStart, windowEnd]. Each instance shares all base fields
// but has a shifted start/end. The ExternalID is set to "<baseID>:<YYYY-MM-DD>"
// and IsRecurrenceInstance is true.
func ExpandRRule(base *model.Event, windowStart, windowEnd time.Time) ([]*model.Event, error) {
	opt, err := rrule.StrToROption(base.RecurrenceRule)
	if err != nil {
		return nil, fmt.Errorf("parsing rrule: %w", err)
	}
	// DTSTART defaults to the base event's start_time if not set in the rule.
	if opt.Dtstart.IsZero() {
		opt.Dtstart = base.StartTime
	}
	rs, err := rrule.NewRRule(*opt)
	if err != nil {
		return nil, fmt.Errorf("building rrule: %w", err)
	}
	duration := base.EndTime.Sub(base.StartTime)
	occurrences := rs.Between(windowStart, windowEnd, true)
	out := make([]*model.Event, 0, len(occurrences))
	for _, occ := range occurrences {
		inst := *base // shallow copy
		inst.StartTime = occ
		inst.EndTime = occ.Add(duration)
		dateStr := occ.UTC().Format("2006-01-02")
		syntheticID := fmt.Sprintf("%s:%s", base.ID.String(), dateStr)
		// Store synthetic ID as a string in a new field — we reuse ExternalID
		// temporarily as the composite key for the frontend. The base ID is
		// preserved in the ID field so single-event GET still works.
		if inst.ExternalID == nil || *inst.ExternalID == "" {
			inst.ExternalID = &syntheticID
		}
		// Tag this as a recurrence instance.
		inst.IsRecurrenceInstance = true
		out = append(out, &inst)
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
	if s.notify != nil {
		go s.notify.Notify(context.Background(), householdID, "event.created",
			"New event: "+out.Title, "A new event has been added to your household calendar.")
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

package service

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/tidyboard/tidyboard/internal/client"
	"github.com/tidyboard/tidyboard/internal/model"
	"github.com/tidyboard/tidyboard/internal/query"
)

// SyncService orchestrates CalDAV calendar synchronisation via the sync-worker microservice.
type SyncService struct {
	q    *query.Queries
	sync *client.SyncClient
}

// NewSyncService constructs a SyncService.
func NewSyncService(q *query.Queries, sync *client.SyncClient) *SyncService {
	return &SyncService{q: q, sync: sync}
}

// SyncResult is returned by SyncCalendar.
type SyncResult struct {
	SyncedCount int            `json:"synced_count"`
	Events      []*model.Event `json:"events"`
}

// SyncCalendar fetches events from the remote CalDAV calendar and upserts them
// into the local events table. It returns the count and the full event list.
// Errors: ErrNotFound when the calendar doesn't exist, ErrSyncTimeout on deadline,
// ErrSyncFailed on non-2xx from the worker.
func (s *SyncService) SyncCalendar(
	ctx context.Context,
	householdID, calendarID uuid.UUID,
	rangeStart, rangeEnd time.Time,
) (*SyncResult, error) {
	cal, err := s.q.GetCalendar(ctx, query.GetCalendarParams{
		ID:          calendarID,
		HouseholdID: householdID,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("fetching calendar: %w", err)
	}

	synced, err := s.sync.Sync(ctx, client.SyncRequest{
		HouseholdID: householdID.String(),
		CalendarURL: cal.Url,
		Username:    cal.Username,
		Password:    cal.PasswordEncrypted, // placeholder — decryption is TODO
		RangeStart:  rangeStart.UTC().Format(time.RFC3339),
		RangeEnd:    rangeEnd.UTC().Format(time.RFC3339),
	})
	if err != nil {
		if isTimeoutErr(err) {
			return nil, ErrSyncTimeout
		}
		return nil, fmt.Errorf("%w: %v", ErrSyncFailed, err)
	}

	calNullUUID := &uuid.NullUUID{UUID: calendarID, Valid: true}

	events := make([]*model.Event, 0, len(synced))
	for _, se := range synced {
		startTime, err := time.Parse(time.RFC3339, se.DTStart)
		if err != nil {
			// Try without timezone suffix
			startTime, err = time.Parse("20060102T150405Z", se.DTStart)
			if err != nil {
				startTime = time.Now().UTC()
			}
		}
		endTime, err := time.Parse(time.RFC3339, se.DTEnd)
		if err != nil {
			endTime, err = time.Parse("20060102T150405Z", se.DTEnd)
			if err != nil {
				endTime = startTime.Add(time.Hour)
			}
		}

		rrule := ""
		if se.RRule != nil {
			rrule = *se.RRule
		}
		location := ""
		if se.Location != nil {
			location = *se.Location
		}
		description := ""
		if se.Description != nil {
			description = *se.Description
		}

		externalID := se.ExternalID

		e, err := s.q.UpsertEventByExternalID(ctx, query.UpsertEventByExternalIDParams{
			ID:              uuid.New(),
			HouseholdID:     householdID,
			CalendarID:      calNullUUID,
			ExternalID:      &externalID,
			Title:           se.Summary,
			Description:     description,
			StartTime:       pgtype.Timestamptz{Time: startTime, Valid: true},
			EndTime:         pgtype.Timestamptz{Time: endTime, Valid: true},
			AllDay:          false,
			Location:        location,
			RecurrenceRule:  rrule,
			AssignedMembers: []uuid.UUID{},
			Reminders:       []byte("[]"),
		})
		if err != nil {
			return nil, fmt.Errorf("upserting event %q: %w", se.ExternalID, err)
		}
		events = append(events, eventToModel(e))
	}

	return &SyncResult{
		SyncedCount: len(events),
		Events:      events,
	}, nil
}

// SyncICalURL fetches events from a public iCal URL and upserts them into the local events table.
// It mirrors SyncCalendar but calls the sync-worker's /sync/ical endpoint instead.
func (s *SyncService) SyncICalURL(
	ctx context.Context,
	householdID, calendarID uuid.UUID,
	icsURL, rangeStart, rangeEnd string,
) (*SyncResult, error) {
	synced, err := s.sync.SyncICal(ctx, client.SyncICalRequest{
		HouseholdID: householdID.String(),
		CalendarID:  calendarID.String(),
		ICSURL:      icsURL,
		RangeStart:  rangeStart,
		RangeEnd:    rangeEnd,
	})
	if err != nil {
		if isTimeoutErr(err) {
			return nil, ErrSyncTimeout
		}
		return nil, fmt.Errorf("%w: %v", ErrSyncFailed, err)
	}

	calNullUUID := &uuid.NullUUID{UUID: calendarID, Valid: true}

	events := make([]*model.Event, 0, len(synced))
	for _, se := range synced {
		startTime, err := time.Parse(time.RFC3339, se.DTStart)
		if err != nil {
			startTime, err = time.Parse("20060102T150405Z", se.DTStart)
			if err != nil {
				startTime = time.Now().UTC()
			}
		}
		endTime, err := time.Parse(time.RFC3339, se.DTEnd)
		if err != nil {
			endTime, err = time.Parse("20060102T150405Z", se.DTEnd)
			if err != nil {
				endTime = startTime.Add(time.Hour)
			}
		}

		rrule := ""
		if se.RRule != nil {
			rrule = *se.RRule
		}
		location := ""
		if se.Location != nil {
			location = *se.Location
		}
		description := ""
		if se.Description != nil {
			description = *se.Description
		}

		externalID := se.ExternalID

		e, err := s.q.UpsertEventByExternalID(ctx, query.UpsertEventByExternalIDParams{
			ID:              uuid.New(),
			HouseholdID:     householdID,
			CalendarID:      calNullUUID,
			ExternalID:      &externalID,
			Title:           se.Summary,
			Description:     description,
			StartTime:       pgtype.Timestamptz{Time: startTime, Valid: true},
			EndTime:         pgtype.Timestamptz{Time: endTime, Valid: true},
			AllDay:          false,
			Location:        location,
			RecurrenceRule:  rrule,
			AssignedMembers: []uuid.UUID{},
			Reminders:       []byte("[]"),
		})
		if err != nil {
			return nil, fmt.Errorf("upserting ical event %q: %w", se.ExternalID, err)
		}
		events = append(events, eventToModel(e))
	}

	return &SyncResult{
		SyncedCount: len(events),
		Events:      events,
	}, nil
}

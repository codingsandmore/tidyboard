//go:build integration

package testutil

import (
	"time"

	"github.com/google/uuid"
	"github.com/tidyboard/tidyboard/internal/model"
)

// HouseholdOption is a functional option for MakeHousehold.
type HouseholdOption func(*model.Household)

// MakeHousehold creates an in-memory Household for use in tests.
// Call with functional options to override defaults.
func MakeHousehold(opts ...HouseholdOption) *model.Household {
	h := &model.Household{
		ID:         uuid.New(),
		Name:       "Test Family",
		Timezone:   "America/Los_Angeles",
		CreatedBy:  uuid.New(),
		InviteCode: "TESTCODE",
		CreatedAt:  time.Now().UTC(),
		UpdatedAt:  time.Now().UTC(),
	}
	for _, o := range opts {
		o(h)
	}
	return h
}

// WithHouseholdName sets the household name.
func WithHouseholdName(name string) HouseholdOption {
	return func(h *model.Household) { h.Name = name }
}

// MemberOption is a functional option for MakeMember.
type MemberOption func(*model.Member)

// MakeMember creates an in-memory Member for use in tests.
func MakeMember(householdID uuid.UUID, opts ...MemberOption) *model.Member {
	m := &model.Member{
		ID:          uuid.New(),
		HouseholdID: householdID,
		Name:        "Test Member",
		DisplayName: "Tester",
		Color:       "#4A90E2",
		AvatarURL:   "",
		Role:        "member",
		AgeGroup:    "adult",
		CreatedAt:   time.Now().UTC(),
		UpdatedAt:   time.Now().UTC(),
	}
	for _, o := range opts {
		o(m)
	}
	return m
}

// WithMemberRole sets the member role.
func WithMemberRole(role string) MemberOption {
	return func(m *model.Member) { m.Role = role }
}

// WithMemberName sets the member name.
func WithMemberName(name string) MemberOption {
	return func(m *model.Member) { m.Name = name }
}

// EventOption is a functional option for MakeEvent.
type EventOption func(*model.Event)

// MakeEvent creates an in-memory Event for use in tests.
func MakeEvent(householdID uuid.UUID, opts ...EventOption) *model.Event {
	now := time.Now().UTC()
	e := &model.Event{
		ID:          uuid.New(),
		HouseholdID: householdID,
		Title:       "Test Event",
		Description: "",
		StartTime:   now.Add(time.Hour),
		EndTime:     now.Add(2 * time.Hour),
		AllDay:      false,
		CreatedAt:   now,
		UpdatedAt:   now,
	}
	for _, o := range opts {
		o(e)
	}
	return e
}

// WithEventTitle sets the event title.
func WithEventTitle(title string) EventOption {
	return func(e *model.Event) { e.Title = title }
}

// WithEventAllDay marks the event as all-day.
func WithEventAllDay(allDay bool) EventOption {
	return func(e *model.Event) { e.AllDay = allDay }
}

//go:build unit

package service_test

import (
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/tidyboard/tidyboard/internal/model"
	"github.com/tidyboard/tidyboard/internal/service"
)

// TestExpandRRule_DailyOver7Days verifies that a FREQ=DAILY event expands to
// exactly 7 occurrences when the window exactly covers 7 days.
func TestExpandRRule_DailyOver7Days(t *testing.T) {
	dtstart := time.Date(2026, 4, 21, 9, 0, 0, 0, time.UTC)
	base := &model.Event{
		ID:             uuid.New(),
		Title:          "Daily standup",
		StartTime:      dtstart,
		EndTime:        dtstart.Add(30 * time.Minute),
		RecurrenceRule: "FREQ=DAILY",
	}

	windowStart := dtstart
	// [dtstart, dtstart+7days) — 7 full days: occurrences on days 0..6.
	// Between() is inclusive so use dtstart + 6 days + 23h to get exactly 7.
	windowEnd := dtstart.Add(7*24*time.Hour - time.Second)

	occurrences, err := service.ExpandRRule(base, windowStart, windowEnd)
	require.NoError(t, err)
	assert.Len(t, occurrences, 7, "expected 7 daily occurrences")

	for i, occ := range occurrences {
		expected := dtstart.Add(time.Duration(i) * 24 * time.Hour)
		assert.Equal(t, expected, occ.StartTime, "occurrence %d start_time mismatch", i)
		assert.Equal(t, expected.Add(30*time.Minute), occ.EndTime, "occurrence %d end_time mismatch", i)
		assert.True(t, occ.IsRecurrenceInstance, "occurrence %d should be marked as recurrence instance", i)
		assert.Equal(t, base.ID, occ.ID, "occurrence %d should preserve base event ID", i)
	}
}

// TestExpandRRule_InvalidRule verifies that an unparseable RRULE returns an error.
func TestExpandRRule_InvalidRule(t *testing.T) {
	base := &model.Event{
		ID:             uuid.New(),
		Title:          "Bad rule",
		StartTime:      time.Now(),
		EndTime:        time.Now().Add(time.Hour),
		RecurrenceRule: "NOT_A_VALID_RRULE",
	}
	_, err := service.ExpandRRule(base, time.Now(), time.Now().Add(7*24*time.Hour))
	assert.Error(t, err)
}

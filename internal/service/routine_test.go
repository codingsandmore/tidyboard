package service

import (
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/stretchr/testify/assert"
	"github.com/tidyboard/tidyboard/internal/query"
)

// TestGetStreakCalc tests the streak calculation logic in isolation.
// It exercises the in-memory calculation that happens after GetDailyCompletionCounts
// returns rows. We simulate the calculation directly to avoid needing a DB.
func TestGetStreakCalc(t *testing.T) {
	totalSteps := int64(3)

	// Helper: build a GetDailyCompletionCountsRow for a given offset from today.
	day := func(daysAgo int, count int64) query.GetDailyCompletionCountsRow {
		d := time.Now().UTC().AddDate(0, 0, -daysAgo)
		return query.GetDailyCompletionCountsRow{
			Day:             pgtype.Date{Time: d, Valid: true},
			CompletionCount: count,
		}
	}

	calc := func(rows []query.GetDailyCompletionCountsRow) int {
		completedDays := make(map[string]bool)
		for _, row := range rows {
			if row.Day.Valid && row.CompletionCount >= totalSteps {
				completedDays[row.Day.Time.Format("2006-01-02")] = true
			}
		}
		streak := 0
		today := time.Now().UTC()
		for d := 0; d < 90; d++ {
			dayKey := today.AddDate(0, 0, -d).Format("2006-01-02")
			if completedDays[dayKey] {
				streak++
			} else {
				break
			}
		}
		return streak
	}

	t.Run("7 days all complete => streak 7", func(t *testing.T) {
		rows := make([]query.GetDailyCompletionCountsRow, 7)
		for i := 0; i < 7; i++ {
			rows[i] = day(i, 3) // exactly totalSteps
		}
		assert.Equal(t, 7, calc(rows))
	})

	t.Run("5 of 7 days complete with gap => streak 5 starting today", func(t *testing.T) {
		// Days 0-4 complete, day 5 missing, day 6 complete
		rows := []query.GetDailyCompletionCountsRow{
			day(0, 3),
			day(1, 3),
			day(2, 3),
			day(3, 3),
			day(4, 3),
			// day 5 is absent
			day(6, 3),
		}
		assert.Equal(t, 5, calc(rows))
	})

	t.Run("today not complete breaks streak", func(t *testing.T) {
		rows := []query.GetDailyCompletionCountsRow{
			day(1, 3),
			day(2, 3),
			day(3, 3),
		}
		assert.Equal(t, 0, calc(rows))
	})

	t.Run("partial completion (below step count) does not count", func(t *testing.T) {
		rows := []query.GetDailyCompletionCountsRow{
			day(0, 2), // only 2 of 3 steps
			day(1, 3),
		}
		assert.Equal(t, 0, calc(rows))
	})

	t.Run("empty rows => streak 0", func(t *testing.T) {
		assert.Equal(t, 0, calc(nil))
	})
}

// TestRoutineToModel verifies routineToModel converts query.Routine correctly.
func TestRoutineToModel(t *testing.T) {
	hid := uuid.New()
	mid := uuid.New()
	rid := uuid.New()

	r := query.Routine{
		ID:          rid,
		HouseholdID: hid,
		Name:        "Morning",
		MemberID:    &uuid.NullUUID{UUID: mid, Valid: true},
		DaysOfWeek:  []string{"mon", "tue", "wed"},
		TimeSlot:    "morning",
		Archived:    false,
		SortOrder:   1,
		CreatedAt:   pgtype.Timestamptz{Time: time.Now(), Valid: true},
		UpdatedAt:   pgtype.Timestamptz{Time: time.Now(), Valid: true},
	}

	m := routineToModel(r)
	assert.Equal(t, rid, m.ID)
	assert.Equal(t, hid, m.HouseholdID)
	assert.Equal(t, "Morning", m.Name)
	assert.NotNil(t, m.MemberID)
	assert.Equal(t, mid, *m.MemberID)
	assert.Equal(t, []string{"mon", "tue", "wed"}, m.DaysOfWeek)
	assert.Equal(t, "morning", m.TimeSlot)
	assert.Equal(t, 1, m.SortOrder)
}

// TestStepToModel verifies stepToModel converts query.RoutineStep correctly.
func TestStepToModel(t *testing.T) {
	rid := uuid.New()
	sid := uuid.New()
	est := int32(5)
	icon := "🦷"

	s := query.RoutineStep{
		ID:         sid,
		RoutineID:  rid,
		Name:       "Brush teeth",
		EstMinutes: &est,
		SortOrder:  2,
		Icon:       &icon,
		CreatedAt:  pgtype.Timestamptz{Time: time.Now(), Valid: true},
		UpdatedAt:  pgtype.Timestamptz{Time: time.Now(), Valid: true},
	}

	m := stepToModel(s)
	assert.Equal(t, sid, m.ID)
	assert.Equal(t, rid, m.RoutineID)
	assert.Equal(t, "Brush teeth", m.Name)
	assert.NotNil(t, m.EstMinutes)
	assert.Equal(t, 5, *m.EstMinutes)
	assert.Equal(t, 2, m.SortOrder)
	assert.NotNil(t, m.Icon)
	assert.Equal(t, "🦷", *m.Icon)
}

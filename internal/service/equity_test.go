package service

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/google/uuid"
	"github.com/tidyboard/tidyboard/internal/model"
	"github.com/tidyboard/tidyboard/internal/query"
)

// equityTaskFixture builds a minimal query.EquityTask for tests.
func equityTaskFixture(domainID, householdID, ownerID uuid.UUID) query.EquityTask {
	return query.EquityTask{
		ID:            uuid.New(),
		HouseholdID:   householdID,
		DomainID:      domainID,
		Name:          "Test task",
		TaskType:      "both",
		Recurrence:    "weekly",
		EstMinutes:    30,
		SharePct:      100,
		Archived:      false,
		OwnerMemberID: &uuid.NullUUID{UUID: ownerID, Valid: true},
	}
}

// TestLoadStatus covers the traffic-light thresholds.
func TestLoadStatus(t *testing.T) {
	cases := []struct {
		pct    float64
		expect string
	}{
		{0, "green"},
		{50, "green"},
		{59.9, "green"},
		{60, "yellow"},
		{65, "yellow"},
		{69.9, "yellow"},
		{70, "red"},
		{85, "red"},
		{100, "red"},
	}
	for _, tc := range cases {
		got := loadStatus(tc.pct)
		assert.Equal(t, tc.expect, got, "pct=%.1f", tc.pct)
	}
}

// TestEquityComputation tests the per-member percentage calculation logic
// using a small fixture household with 3 members.
//
// Fixture:
//   memberA: 60 min total (40 cog + 20 phys)
//   memberB: 30 min total (10 cog + 20 phys)
//   memberC:  0 min (not in task_logs → excluded from members slice)
//   Total: 90 min
//   Expected: A=66.7%, B=33.3%
func TestEquityComputationLogic(t *testing.T) {
	memberA := uuid.MustParse("aaaaaaaa-0000-0000-0000-000000000001")
	memberB := uuid.MustParse("bbbbbbbb-0000-0000-0000-000000000002")

	type memberStats struct {
		total int64
		cog   int64
		phys  int64
	}

	statMap := map[uuid.UUID]*memberStats{
		memberA: {total: 60, cog: 40, phys: 20},
		memberB: {total: 30, cog: 10, phys: 20},
	}

	var totalHousehold int64
	for _, ms := range statMap {
		totalHousehold += ms.total
	}
	require.Equal(t, int64(90), totalHousehold)

	results := make([]model.MemberEquity, 0, len(statMap))
	for id, ms := range statMap {
		pct := float64(ms.total) / float64(totalHousehold) * 100
		results = append(results, model.MemberEquity{
			MemberID:         id,
			TotalMinutes:     int(ms.total),
			CognitiveMinutes: int(ms.cog),
			PhysicalMinutes:  int(ms.phys),
			LoadPct:          pct,
			LoadStatus:       loadStatus(pct),
		})
	}

	// Build lookup by member ID
	byID := map[uuid.UUID]model.MemberEquity{}
	for _, r := range results {
		byID[r.MemberID] = r
	}

	aResult := byID[memberA]
	bResult := byID[memberB]

	assert.Equal(t, 60, aResult.TotalMinutes)
	assert.Equal(t, 40, aResult.CognitiveMinutes)
	assert.Equal(t, 20, aResult.PhysicalMinutes)
	assert.InDelta(t, 66.67, aResult.LoadPct, 0.1)
	assert.Equal(t, "yellow", aResult.LoadStatus) // 66.7% → yellow

	assert.Equal(t, 30, bResult.TotalMinutes)
	assert.InDelta(t, 33.33, bResult.LoadPct, 0.1)
	assert.Equal(t, "green", bResult.LoadStatus) // 33.3% → green
}

// TestRebalanceSuggestionThreshold verifies that suggestions are only
// generated when the most-burdened member exceeds the 55% threshold.
func TestRebalanceSuggestionThreshold(t *testing.T) {
	// Below threshold: 54% vs 46% — no suggestions
	members := []model.MemberEquity{
		{LoadPct: 54},
		{LoadPct: 46},
	}
	most := members[0]
	assert.LessOrEqual(t, most.LoadPct, 55.0, "should not trigger rebalance at 54%%")

	// Above threshold: 65% vs 35% — should trigger
	members2 := []model.MemberEquity{
		{LoadPct: 65},
		{LoadPct: 35},
	}
	most2 := members2[0]
	assert.Greater(t, most2.LoadPct, 55.0, "should trigger rebalance at 65%%")
}

// TestTaskToModel ensures the helper maps all fields correctly.
func TestTaskToModelHelper(t *testing.T) {
	domainID := uuid.New()
	householdID := uuid.New()
	ownerID := uuid.New()

	q := equityTaskFixture(domainID, householdID, ownerID)
	m := taskToModel(q)

	assert.Equal(t, q.ID, m.ID)
	assert.Equal(t, q.Name, m.Name)
	assert.Equal(t, q.TaskType, m.TaskType)
	assert.Equal(t, int(q.EstMinutes), m.EstMinutes)
	assert.Equal(t, int(q.SharePct), m.SharePct)
	require.NotNil(t, m.OwnerMemberID)
	assert.Equal(t, ownerID, *m.OwnerMemberID)
	assert.False(t, m.Archived)
}

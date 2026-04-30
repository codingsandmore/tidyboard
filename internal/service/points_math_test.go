package service

import (
	"testing"
	"time"
)

type adj struct {
	delta     int
	expiresAt *time.Time
}

func TestEffectiveCost(t *testing.T) {
	now := time.Date(2026, 4, 26, 12, 0, 0, 0, time.UTC)
	past := now.Add(-time.Hour)
	future := now.Add(time.Hour)

	cases := []struct {
		name string
		base int
		adjs []adj
		want int
	}{
		{"no adjustments", 100, nil, 100},
		{"one positive adjustment", 100, []adj{{delta: 50, expiresAt: nil}}, 150},
		{"one negative adjustment (forgiveness)", 100, []adj{{delta: -25, expiresAt: nil}}, 75},
		{"sum of multiple adjustments", 100, []adj{{delta: 30, expiresAt: nil}, {delta: 20, expiresAt: nil}}, 150},
		{"expired adjustment ignored", 100, []adj{{delta: 50, expiresAt: &past}}, 100},
		{"future-expiring adjustment counted", 100, []adj{{delta: 50, expiresAt: &future}}, 150},
		{"floor at zero (cannot go negative)", 100, []adj{{delta: -250, expiresAt: nil}}, 0},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			deltas := make([]CostAdjustment, len(tc.adjs))
			for i, a := range tc.adjs {
				deltas[i] = CostAdjustment{Delta: a.delta, ExpiresAt: a.expiresAt}
			}
			got := EffectiveCost(tc.base, deltas, now)
			if got != tc.want {
				t.Fatalf("EffectiveCost(%d, %+v) = %d, want %d", tc.base, deltas, got, tc.want)
			}
		})
	}
}

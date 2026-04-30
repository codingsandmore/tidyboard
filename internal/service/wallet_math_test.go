package service_test

import (
	"testing"

	"github.com/tidyboard/tidyboard/internal/service"
)

type chorePlan struct {
	Weight    int
	Frequency int // instances per week
}

func TestPerInstancePayout_Examples(t *testing.T) {
	tests := []struct {
		name           string
		allowanceCents int64
		chores         []chorePlan
		choreIdx       int
		want           int64
	}{
		{
			name:           "single chore weekly",
			allowanceCents: 500,
			chores:         []chorePlan{{Weight: 3, Frequency: 1}},
			choreIdx:       0,
			want:           500,
		},
		{
			name:           "5 dollars over 27 daily-ish instances at uniform weight 3",
			allowanceCents: 500,
			chores: []chorePlan{
				{Weight: 3, Frequency: 7}, // brush teeth daily
				{Weight: 3, Frequency: 7}, // make bed
				{Weight: 3, Frequency: 7}, // feed dog
				{Weight: 3, Frequency: 5}, // homework weekdays
				{Weight: 3, Frequency: 1}, // trash
			},
			choreIdx: 0,
			want:     18, // floor(500*3 / (3*7+3*7+3*7+3*5+3*1)) = floor(1500/81) = 18
		},
		{
			name:           "weighted: trash weight 5 vs brush teeth weight 1",
			allowanceCents: 500,
			chores: []chorePlan{
				{Weight: 1, Frequency: 7}, // brush teeth
				{Weight: 5, Frequency: 1}, // trash
			},
			choreIdx: 1,
			want:     208, // floor(500*5 / (1*7+5*1)) = floor(2500/12) = 208
		},
		{
			name:           "zero allowance => zero",
			allowanceCents: 0,
			chores:         []chorePlan{{Weight: 3, Frequency: 7}},
			choreIdx:       0,
			want:           0,
		},
		{
			name:           "no chores => zero (degenerate)",
			allowanceCents: 500,
			chores:         []chorePlan{},
			choreIdx:       0,
			want:           0,
		},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			weights := make([]int, len(tc.chores))
			freqs := make([]int, len(tc.chores))
			for i, c := range tc.chores {
				weights[i] = c.Weight
				freqs[i] = c.Frequency
			}
			divisor := service.WeeklyDivisor(weights, freqs)
			if len(tc.chores) == 0 {
				if got := service.PerInstancePayout(tc.allowanceCents, 3, divisor); got != tc.want {
					t.Errorf("got %d, want %d", got, tc.want)
				}
				return
			}
			got := service.PerInstancePayout(tc.allowanceCents, weights[tc.choreIdx], divisor)
			if got != tc.want {
				t.Errorf("PerInstancePayout(allowance=%d, chore[%d]) = %d, want %d", tc.allowanceCents, tc.choreIdx, got, tc.want)
			}
		})
	}
}

func TestStreakBonus(t *testing.T) {
	tests := []struct {
		name       string
		weekTotalC int64
		want       int64
	}{
		{"100% completion of $1.20 worth", 120, 12},
		{"odd cents round half-up to 1", 5, 1},
		{"zero in zero out", 0, 0},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got := service.StreakBonus(tc.weekTotalC)
			if got != tc.want {
				t.Errorf("StreakBonus(%d) = %d, want %d", tc.weekTotalC, got, tc.want)
			}
		})
	}
}

func TestPerInstancePayout_DegenerateInputs(t *testing.T) {
	if got := service.PerInstancePayout(100, 0, 10); got != 0 {
		t.Errorf("weight=0 should be 0, got %d", got)
	}
	if got := service.PerInstancePayout(100, 3, 0); got != 0 {
		t.Errorf("divisor=0 should be 0, got %d", got)
	}
}

func TestWeeklyDivisor(t *testing.T) {
	got := service.WeeklyDivisor([]int{1, 5}, []int{7, 1})
	if got != 12 {
		t.Errorf("WeeklyDivisor([1,5],[7,1]) = %d, want 12", got)
	}
}

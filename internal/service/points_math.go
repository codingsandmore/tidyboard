package service

import "time"

// CostAdjustment is a per-member, per-reward effective-cost shift.
type CostAdjustment struct {
	Delta     int
	ExpiresAt *time.Time
}

// EffectiveCost returns base + sum of currently-active adjustments,
// floored at zero. An adjustment is "active" if it has no expires_at
// or its expires_at is in the future relative to `now`.
func EffectiveCost(base int, adjs []CostAdjustment, now time.Time) int {
	total := base
	for _, a := range adjs {
		if a.ExpiresAt != nil && !a.ExpiresAt.After(now) {
			continue
		}
		total += a.Delta
	}
	if total < 0 {
		return 0
	}
	return total
}

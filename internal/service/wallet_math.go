// Package service — wallet payout math.
//
// These functions are intentionally pure (no DB, no clock) so they can be
// table-tested exhaustively. The frontend ports the same math to TypeScript
// in web/src/lib/wallet/payout-math.ts; if you change one, change the other.
package service

// WeeklyDivisor returns Σ(weight_i × frequency_i) for a kid's active chores.
// Used as the denominator in PerInstancePayout.
func WeeklyDivisor(weights, frequencies []int) int {
	if len(weights) != len(frequencies) {
		return 0
	}
	d := 0
	for i := range weights {
		if weights[i] < 0 || frequencies[i] < 0 {
			continue
		}
		d += weights[i] * frequencies[i]
	}
	return d
}

// PerInstancePayout returns the cents paid for one completion of a chore.
// per_instance_cents = floor((allowance × weight) / divisor)
// Returns 0 on any degenerate input (zero divisor, zero weight, etc.) so
// callers don't have to special-case.
func PerInstancePayout(allowanceCents int64, weight int, divisor int) int64 {
	if allowanceCents <= 0 || weight <= 0 || divisor <= 0 {
		return 0
	}
	return (allowanceCents * int64(weight)) / int64(divisor)
}

// StreakBonus is 10% of the chore's total weekly payout, rounded half-up.
// Applied when a kid completes 100% of a chore's expected instances in a week.
func StreakBonus(weekTotalCents int64) int64 {
	if weekTotalCents <= 0 {
		return 0
	}
	return (weekTotalCents + 5) / 10
}

// web/src/lib/wallet/payout-math.ts
//
// TypeScript mirror of internal/service/wallet_math.go. The math runs both
// server-side (authoritative) and client-side (preview UI). KEEP THESE IN
// SYNC — payout-math.test.ts ports the same Go test cases so a drift fails
// the JS suite.

export function weeklyDivisor(weights: number[], frequencies: number[]): number {
  if (weights.length !== frequencies.length) return 0;
  let d = 0;
  for (let i = 0; i < weights.length; i++) {
    if (weights[i] < 0 || frequencies[i] < 0) continue;
    d += weights[i] * frequencies[i];
  }
  return d;
}

export function perInstancePayout(allowanceCents: number, weight: number, divisor: number): number {
  if (allowanceCents <= 0 || weight <= 0 || divisor <= 0) return 0;
  return Math.floor((allowanceCents * weight) / divisor);
}

export function streakBonus(weekTotalCents: number): number {
  if (weekTotalCents <= 0) return 0;
  return Math.floor((weekTotalCents + 5) / 10);
}

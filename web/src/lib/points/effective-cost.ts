export interface CostAdjustment {
  delta: number;
  expires_at: string | null;
}

export function effectiveCost(
  base: number,
  adjs: CostAdjustment[],
  now: Date = new Date()
): number {
  let total = base;
  for (const a of adjs) {
    if (a.expires_at && new Date(a.expires_at) <= now) continue;
    total += a.delta;
  }
  return total < 0 ? 0 : total;
}

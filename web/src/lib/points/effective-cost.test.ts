import { describe, it, expect } from "vitest";
import { effectiveCost, type CostAdjustment } from "./effective-cost";

describe("effectiveCost", () => {
  const now = new Date("2026-04-26T12:00:00Z");
  const past = new Date("2026-04-26T11:00:00Z").toISOString();
  const future = new Date("2026-04-26T13:00:00Z").toISOString();

  const cases: Array<{ name: string; base: number; adjs: CostAdjustment[]; want: number }> = [
    { name: "no adjustments", base: 100, adjs: [], want: 100 },
    { name: "one positive", base: 100, adjs: [{ delta: 50, expires_at: null }], want: 150 },
    { name: "one negative (forgiveness)", base: 100, adjs: [{ delta: -25, expires_at: null }], want: 75 },
    { name: "sum of multiple", base: 100, adjs: [{ delta: 30, expires_at: null }, { delta: 20, expires_at: null }], want: 150 },
    { name: "expired ignored", base: 100, adjs: [{ delta: 50, expires_at: past }], want: 100 },
    { name: "future-expiring counted", base: 100, adjs: [{ delta: 50, expires_at: future }], want: 150 },
    { name: "floor at zero", base: 100, adjs: [{ delta: -250, expires_at: null }], want: 0 },
  ];

  for (const tc of cases) {
    it(tc.name, () => {
      expect(effectiveCost(tc.base, tc.adjs, now)).toBe(tc.want);
    });
  }
});

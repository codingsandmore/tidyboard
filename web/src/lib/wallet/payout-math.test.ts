import { describe, it, expect } from "vitest";
import { perInstancePayout, weeklyDivisor, streakBonus } from "./payout-math";

describe("payout-math", () => {
  it("single chore weekly returns full allowance", () => {
    expect(perInstancePayout(500, 3, weeklyDivisor([3], [1]))).toBe(500);
  });
  it("uniform-weight 5-chore example", () => {
    const div = weeklyDivisor([3, 3, 3, 3, 3], [7, 7, 7, 5, 1]);
    expect(perInstancePayout(500, 3, div)).toBe(18);
  });
  it("weighted: trash 5 vs brush 1", () => {
    const div = weeklyDivisor([1, 5], [7, 1]);
    expect(perInstancePayout(500, 5, div)).toBe(208);
  });
  it("zero allowance => zero", () => {
    expect(perInstancePayout(0, 3, 81)).toBe(0);
  });
  it("zero divisor => zero (degenerate)", () => {
    expect(perInstancePayout(500, 3, 0)).toBe(0);
  });
  it("zero weight => zero (degenerate)", () => {
    expect(perInstancePayout(500, 0, 81)).toBe(0);
  });
  it("streak bonus rounds half-up", () => {
    expect(streakBonus(120)).toBe(12);
    expect(streakBonus(5)).toBe(1);
    expect(streakBonus(0)).toBe(0);
  });
  it("weeklyDivisor mismatched arrays => zero", () => {
    expect(weeklyDivisor([3, 3], [1])).toBe(0);
  });
  it("weeklyDivisor ignores negative entries", () => {
    expect(weeklyDivisor([3, -1, 5], [7, 7, 1])).toBe(26); // 21 + 5
  });
});

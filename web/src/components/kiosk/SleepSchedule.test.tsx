import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SleepSchedule, isWithinQuietHours } from "./SleepSchedule";

function at(hour: number, minute = 0): Date {
  // Build a Date with deterministic local hours.
  const d = new Date(2026, 3, 30, hour, minute, 0, 0);
  return d;
}

describe("isWithinQuietHours", () => {
  it("returns true for a time inside a non-wrapping window", () => {
    expect(isWithinQuietHours("13:00", "15:00", at(14, 0))).toBe(true);
  });

  it("returns false for a time outside a non-wrapping window", () => {
    expect(isWithinQuietHours("13:00", "15:00", at(12, 59))).toBe(false);
    expect(isWithinQuietHours("13:00", "15:00", at(15, 0))).toBe(false);
  });

  it("returns true at the start boundary (inclusive)", () => {
    expect(isWithinQuietHours("13:00", "15:00", at(13, 0))).toBe(true);
  });

  it("handles a window that wraps past midnight (22:00→06:00)", () => {
    expect(isWithinQuietHours("22:00", "06:00", at(23, 0))).toBe(true);
    expect(isWithinQuietHours("22:00", "06:00", at(2, 0))).toBe(true);
    expect(isWithinQuietHours("22:00", "06:00", at(6, 0))).toBe(false);
    expect(isWithinQuietHours("22:00", "06:00", at(21, 59))).toBe(false);
  });

  it("returns false for a malformed input", () => {
    expect(isWithinQuietHours("nope", "06:00", at(2, 0))).toBe(false);
  });
});

describe("SleepSchedule", () => {
  it("renders no overlay when outside quiet hours", () => {
    render(
      <SleepSchedule start="22:00" end="06:00" now={at(12, 0)}>
        <div>kiosk</div>
      </SleepSchedule>,
    );
    expect(screen.queryByTestId("sleep-schedule-overlay")).toBeNull();
  });

  it("renders the dim overlay when inside quiet hours", () => {
    render(
      <SleepSchedule start="22:00" end="06:00" now={at(23, 30)}>
        <div>kiosk</div>
      </SleepSchedule>,
    );
    expect(screen.getByTestId("sleep-schedule-overlay")).toBeInTheDocument();
  });

  it("still renders children behind the overlay", () => {
    render(
      <SleepSchedule start="22:00" end="06:00" now={at(2, 0)}>
        <div>visible kiosk content</div>
      </SleepSchedule>,
    );
    expect(screen.getByText("visible kiosk content")).toBeInTheDocument();
    expect(screen.getByTestId("sleep-schedule-overlay")).toBeInTheDocument();
  });
});

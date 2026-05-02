import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import { AmbientScreensaver } from "./AmbientScreensaver";

describe("AmbientScreensaver", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders a clock and date", () => {
    const fixed = new Date("2026-04-30T14:30:00");
    render(<AmbientScreensaver clock={fixed} />);
    // Clock element exists. We don't pin the formatted string because it
    // varies by locale, but it must be non-empty.
    const clock = screen.getByTestId("ambient-clock");
    expect(clock.textContent?.trim().length).toBeGreaterThan(0);
    expect(screen.getByTestId("ambient-date").textContent?.trim().length).toBeGreaterThan(0);
  });

  it("renders no reminder card when reminders is empty", () => {
    render(<AmbientScreensaver reminders={[]} />);
    expect(screen.queryByTestId("ambient-reminder")).toBeNull();
  });

  it("renders the first reminder when supplied", () => {
    render(
      <AmbientScreensaver
        reminders={[
          { id: "r1", title: "Trash night", detail: "Wednesday" },
          { id: "r2", title: "Vet appt" },
        ]}
      />,
    );
    const card = screen.getByTestId("ambient-reminder");
    expect(card.textContent).toContain("Trash night");
    expect(card.textContent).toContain("Wednesday");
  });

  it("rotates to the next reminder after rotationMs", () => {
    render(
      <AmbientScreensaver
        rotationMs={1000}
        reminders={[
          { id: "r1", title: "Trash night" },
          { id: "r2", title: "Vet appt" },
        ]}
      />,
    );
    expect(screen.getByTestId("ambient-reminder").textContent).toContain("Trash night");
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByTestId("ambient-reminder").textContent).toContain("Vet appt");
  });

  it("invokes onWake when the screensaver is clicked", () => {
    const onWake = vi.fn();
    render(<AmbientScreensaver onWake={onWake} />);
    fireEvent.click(screen.getByTestId("ambient-screensaver"));
    expect(onWake).toHaveBeenCalledTimes(1);
  });
});

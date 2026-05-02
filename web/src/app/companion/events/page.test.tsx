import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { TBDEvent } from "@/lib/data";

const events: TBDEvent[] = [
  { id: "e-late", title: "Dinner", start: "18:00", end: "19:00", members: [] },
  { id: "e-early", title: "Breakfast", start: "07:00", end: "08:00", members: [] },
];

vi.mock("@/lib/api/hooks", () => ({
  useEvents: () => ({ data: events }),
}));

import CompanionEventsPage from "./page";

describe("/companion/events", () => {
  it("renders the events heading and active tab", () => {
    render(<CompanionEventsPage />);
    expect(screen.getByRole("heading", { name: "Events" })).toBeTruthy();
    expect(
      screen.getByTestId("companion-tab-events").getAttribute("aria-current")
    ).toBe("page");
  });

  it("lists each event in start-time order", () => {
    render(<CompanionEventsPage />);
    const list = screen.getByTestId("companion-events-list");
    const items = list.querySelectorAll("li");
    expect(items.length).toBe(2);
    // Earlier event renders first
    expect(items[0].getAttribute("data-testid")).toBe(
      "companion-event-e-early"
    );
    expect(items[1].getAttribute("data-testid")).toBe(
      "companion-event-e-late"
    );
    expect(screen.getByText("Breakfast")).toBeTruthy();
    expect(screen.getByText("Dinner")).toBeTruthy();
  });

  it("shows an empty state when there are no events", () => {
    vi.doMock("@/lib/api/hooks", () => ({
      useEvents: () => ({ data: [] }),
    }));
    // re-import inside doMock
    return import("./page").then((mod) => {
      const Empty = mod.default;
      render(<Empty />);
      expect(screen.getAllByTestId("companion-events-empty").length).toBeGreaterThan(0);
    });
  });
});

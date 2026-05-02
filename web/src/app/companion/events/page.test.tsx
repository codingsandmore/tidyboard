import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { TBDEvent } from "@/lib/data";

let mockEvents: TBDEvent[] = [
  { id: "e-late", title: "Dinner", start: "18:00", end: "19:00", members: [] },
  { id: "e-early", title: "Breakfast", start: "07:00", end: "08:00", members: [] },
];

vi.mock("@/lib/api/hooks", () => ({
  useEvents: () => ({ data: mockEvents }),
}));

import CompanionEventsPage from "./page";

describe("/companion/events", () => {
  it("renders the events heading and active tab", () => {
    mockEvents = [
      { id: "e-late", title: "Dinner", start: "18:00", end: "19:00", members: [] },
      { id: "e-early", title: "Breakfast", start: "07:00", end: "08:00", members: [] },
    ];
    render(<CompanionEventsPage />);
    expect(screen.getByRole("heading", { name: "Events" })).toBeTruthy();
    expect(
      screen.getByTestId("companion-tab-events").getAttribute("aria-current")
    ).toBe("page");
  });

  it("lists each event in start-time order", () => {
    mockEvents = [
      { id: "e-late", title: "Dinner", start: "18:00", end: "19:00", members: [] },
      { id: "e-early", title: "Breakfast", start: "07:00", end: "08:00", members: [] },
    ];
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
    mockEvents = [];
    render(<CompanionEventsPage />);
    expect(screen.getByTestId("companion-events-empty")).toBeTruthy();
  });
});

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { TBDEvent, Shopping } from "@/lib/data";
import type { ApiChore } from "@/lib/api/types";

const events: TBDEvent[] = [
  { id: "e-1", title: "Soccer", start: "10:00", end: "11:00", members: ["pebbles"] },
  { id: "e-2", title: "Dentist", start: "14:00", end: "15:00", members: ["fred"] },
];

const chores: ApiChore[] = [
  {
    id: "c-1",
    household_id: "hh1",
    member_id: "pebbles",
    name: "Feed Dino",
    weight: 1,
    frequency_kind: "daily",
    days_of_week: [],
    auto_approve: false,
    archived_at: null,
    created_at: "2026-01-05T00:00:00Z",
    updated_at: "2026-01-05T00:00:00Z",
  },
];

const shopping: Shopping = {
  weekOf: "2026-04-30",
  fromRecipes: 0,
  categories: [
    {
      name: "Produce",
      items: [
        { name: "Apples", amt: "6", done: false },
        { name: "Carrots", amt: "1 lb", done: true },
      ],
    },
  ],
};

vi.mock("@/lib/api/hooks", () => ({
  useEvents: () => ({ data: events }),
  useChores: () => ({ data: chores }),
  useShopping: () => ({ data: shopping }),
}));

import CompanionHomePage from "./page";

describe("/companion (home)", () => {
  it("renders without crashing and shows the companion heading", () => {
    render(<CompanionHomePage />);
    expect(screen.getByRole("heading", { name: "Companion" })).toBeTruthy();
    expect(screen.getByTestId("companion-home")).toBeTruthy();
  });

  it("shows tiles linking to the three sub-pages", () => {
    render(<CompanionHomePage />);
    expect(
      screen.getByTestId("companion-home-tile-events").getAttribute("href")
    ).toBe("/companion/events");
    expect(
      screen.getByTestId("companion-home-tile-chores").getAttribute("href")
    ).toBe("/companion/chores");
    expect(
      screen.getByTestId("companion-home-tile-shopping").getAttribute("href")
    ).toBe("/companion/shopping");
  });

  it("shows live counts (events=2, chores=1, shopping outstanding=1)", () => {
    render(<CompanionHomePage />);
    expect(
      screen.getByTestId("companion-home-tile-events-count").textContent
    ).toBe("2");
    expect(
      screen.getByTestId("companion-home-tile-chores-count").textContent
    ).toBe("1");
    expect(
      screen.getByTestId("companion-home-tile-shopping-count").textContent
    ).toBe("1");
  });

  it("home tab is marked active in the bottom shell", () => {
    render(<CompanionHomePage />);
    expect(
      screen.getByTestId("companion-tab-home").getAttribute("aria-current")
    ).toBe("page");
  });
});

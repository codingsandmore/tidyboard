import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { Member } from "@/lib/data";
import type { ApiChore } from "@/lib/api/types";

const members: Member[] = [
  {
    id: "pebbles",
    name: "Pebbles",
    full: "Pebbles Flintstone",
    role: "child",
    color: "#22c55e",
    initial: "P",
    stars: 0,
    streak: 0,
  },
  {
    id: "fred",
    name: "Fred",
    full: "Fred Flintstone",
    role: "adult",
    color: "#1f6feb",
    initial: "F",
    stars: 0,
    streak: 0,
  },
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
  {
    id: "c-2",
    household_id: "hh1",
    member_id: "fred",
    name: "Take out trash",
    weight: 2,
    frequency_kind: "weekly",
    days_of_week: [1],
    auto_approve: true,
    archived_at: null,
    created_at: "2026-01-05T00:00:00Z",
    updated_at: "2026-01-05T00:00:00Z",
  },
  {
    id: "c-3",
    household_id: "hh1",
    member_id: "fred",
    name: "Old archived",
    weight: 1,
    frequency_kind: "daily",
    days_of_week: [],
    auto_approve: false,
    archived_at: "2026-04-01T00:00:00Z",
    created_at: "2026-01-05T00:00:00Z",
    updated_at: "2026-01-05T00:00:00Z",
  },
];

vi.mock("@/lib/api/hooks", () => ({
  useChores: () => ({ data: chores }),
  useMembers: () => ({ data: members }),
}));

import CompanionChoresPage from "./page";

describe("/companion/chores", () => {
  it("renders the chores heading and active tab", () => {
    render(<CompanionChoresPage />);
    expect(screen.getByRole("heading", { name: "Chores" })).toBeTruthy();
    expect(
      screen.getByTestId("companion-tab-chores").getAttribute("aria-current")
    ).toBe("page");
  });

  it("lists active chores and excludes archived ones", () => {
    render(<CompanionChoresPage />);
    expect(screen.getByTestId("companion-chore-c-1")).toBeTruthy();
    expect(screen.getByTestId("companion-chore-c-2")).toBeTruthy();
    expect(screen.queryByTestId("companion-chore-c-3")).toBeNull();
  });

  it("shows the assignee's name and approval mode", () => {
    render(<CompanionChoresPage />);
    expect(screen.getByText("Feed Dino")).toBeTruthy();
    expect(screen.getByText("Take out trash")).toBeTruthy();
    // c-2 is auto_approve=true → "Auto"; c-1 is false → "Approve"
    expect(screen.getAllByText("Auto").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Approve").length).toBeGreaterThan(0);
  });
});

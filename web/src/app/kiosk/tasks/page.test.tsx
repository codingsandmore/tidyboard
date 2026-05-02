import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { Member } from "@/lib/data";
import type { ApiChore, ApiReward } from "@/lib/api/types";

const liveMembers: Member[] = [
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
    id: "dino",
    name: "Dino",
    full: "Dino",
    role: "pet",
    color: "#f59e0b",
    initial: "D",
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
];

const rewards: ApiReward[] = [
  {
    id: "r-1",
    household_id: "hh1",
    name: "Movie night pick",
    description: "Choose the family movie this Friday.",
    image_url: null,
    cost_points: 50,
    fulfillment_kind: "self_serve",
    active: true,
    created_at: "2026-01-05T00:00:00Z",
    updated_at: "2026-01-05T00:00:00Z",
  },
];

vi.mock("@/lib/api/hooks", () => ({
  useLiveMembers: () => ({ data: liveMembers }),
  useChores: () => ({ data: chores }),
  useRewards: () => ({ data: rewards }),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import KioskTasksPage from "./page";

describe("/kiosk/tasks page", () => {
  it("renders the Tasks heading with active tab and widgets", () => {
    render(<KioskTasksPage />);
    expect(screen.getByRole("heading", { name: "Tasks & rewards" })).toBeTruthy();
    expect(
      screen.getByTestId("kiosk-tab-tasks").getAttribute("aria-current")
    ).toBe("page");
    expect(screen.getByTestId("kiosk-chores")).toBeTruthy();
    expect(screen.getByTestId("kiosk-rewards")).toBeTruthy();
  });

  it("shows the chore for Pebbles and excludes Dino column", () => {
    render(<KioskTasksPage />);
    expect(screen.getByTestId("kiosk-chores-column-pebbles")).toBeTruthy();
    expect(screen.queryByTestId("kiosk-chores-column-dino")).toBeNull();
    expect(screen.getByText("Feed Dino")).toBeTruthy();
  });

  it("renders the active reward", () => {
    render(<KioskTasksPage />);
    expect(screen.getByText("Movie night pick")).toBeTruthy();
  });
});

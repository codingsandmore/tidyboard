import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { Member, TBDEvent } from "@/lib/data";

const liveMembers: Member[] = [
  {
    id: "fred",
    name: "Fred",
    full: "Fred Flintstone",
    role: "adult",
    color: "#3b82f6",
    initial: "F",
    stars: 0,
    streak: 0,
  },
];

const liveEvents: TBDEvent[] = [
  {
    id: "ev-mon",
    title: "Quarry meeting",
    start: "2026-01-05T14:00:00.000Z",
    end: "2026-01-05T15:00:00.000Z",
    members: ["fred"],
    start_time: "2026-01-05T14:00:00.000Z",
    end_time: "2026-01-05T15:00:00.000Z",
  },
  {
    id: "ev-fri",
    title: "Bowling night",
    start: "2026-01-09T19:00:00.000Z",
    end: "2026-01-09T21:00:00.000Z",
    members: ["fred"],
    start_time: "2026-01-09T19:00:00.000Z",
    end_time: "2026-01-09T21:00:00.000Z",
  },
];

vi.mock("@/lib/api/hooks", () => ({
  useLiveMembers: () => ({ data: liveMembers }),
  useLiveEvents: () => ({ data: liveEvents }),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import KioskWeekPage from "./page";

describe("/kiosk/week page", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-05T13:00:00.000Z"));
  });

  it("renders the Week heading and tab bar with week active", () => {
    render(<KioskWeekPage />);
    expect(screen.getByRole("heading", { name: "This week" })).toBeTruthy();
    expect(
      screen.getByTestId("kiosk-tab-week").getAttribute("aria-current")
    ).toBe("page");
  });

  it("renders the week calendar grid and agenda widgets", () => {
    render(<KioskWeekPage />);
    expect(screen.getByTestId("kiosk-week")).toBeTruthy();
    expect(screen.getByTestId("kiosk-agenda")).toBeTruthy();
    expect(screen.getByTestId("kiosk-week-event-ev-mon")).toBeTruthy();
    expect(screen.getByTestId("kiosk-week-event-ev-fri")).toBeTruthy();
  });
});

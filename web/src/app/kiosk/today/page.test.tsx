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
  {
    id: "pebbles",
    name: "Pebbles",
    full: "Pebbles Flintstone",
    role: "child",
    color: "#22c55e",
    initial: "P",
    stars: 4,
    streak: 0,
  },
];

const liveEvents: TBDEvent[] = [
  {
    id: "ev-now",
    title: "Quarry meeting",
    start: "2026-01-05T14:00:00.000Z",
    end: "2026-01-05T15:00:00.000Z",
    members: ["fred"],
    location: "Quarry",
    start_time: "2026-01-05T14:00:00.000Z",
    end_time: "2026-01-05T15:00:00.000Z",
  },
  {
    id: "ev-later",
    title: "School pickup",
    start: "2026-01-05T15:00:00.000Z",
    end: "2026-01-05T15:30:00.000Z",
    members: ["fred", "pebbles"],
    start_time: "2026-01-05T15:00:00.000Z",
    end_time: "2026-01-05T15:30:00.000Z",
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

import KioskTodayPage from "./page";

describe("/kiosk/today page", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-05T13:00:00.000Z"));
  });

  it("renders the Today heading and the kiosk tab bar", () => {
    render(<KioskTodayPage />);
    expect(screen.getByRole("heading", { name: "Today" })).toBeTruthy();
    expect(screen.getByTestId("kiosk-tab-bar")).toBeTruthy();
    expect(
      screen.getByTestId("kiosk-tab-today").getAttribute("aria-current")
    ).toBe("page");
  });

  it("renders the clock-weather and agenda widgets", () => {
    render(<KioskTodayPage />);
    expect(screen.getByTestId("kiosk-clock-weather")).toBeTruthy();
    expect(screen.getByTestId("kiosk-agenda")).toBeTruthy();
  });

  it("highlights the upcoming next-up event", () => {
    render(<KioskTodayPage />);
    expect(screen.getByTestId("kiosk-next-event-title").textContent).toBe(
      "Quarry meeting"
    );
  });

  it("lists today's events", () => {
    render(<KioskTodayPage />);
    expect(screen.getByTestId("kiosk-agenda-item-ev-now")).toBeTruthy();
    expect(screen.getByTestId("kiosk-agenda-item-ev-later")).toBeTruthy();
  });
});

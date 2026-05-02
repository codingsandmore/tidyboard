import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { TBDEvent, MealPlan, Recipe, Shopping } from "@/lib/data";
import type { ApiChore, ApiReward } from "@/lib/api/types";
import type { WidgetMember } from "@/lib/family-roster";
import {
  AgendaListWidget,
  ChoreBoardWidget,
  ClockWeatherWidget,
  MealStripWidget,
  NextEventWidget,
  RewardsWidget,
  ShoppingWidget,
  WeekCalendarWidget,
} from "./index";

// ── Fixtures: Flintstones-style widget members ─────────────────────────────

const members: WidgetMember[] = [
  { id: "fred", name: "Fred", role: "adult", color: "#3b82f6", initials: "FF" },
  { id: "wilma", name: "Wilma", role: "adult", color: "#ec4899", initials: "WF" },
  { id: "pebbles", name: "Pebbles", role: "child", color: "#22c55e", initials: "PF" },
  { id: "dino", name: "Dino", role: "pet", color: "#f59e0b", initials: "D" },
];

const events: TBDEvent[] = [
  {
    id: "ev-1",
    title: "School pickup",
    start: "2026-01-05T15:00:00.000Z",
    end: "2026-01-05T15:30:00.000Z",
    members: ["fred", "pebbles"],
    location: "School",
    start_time: "2026-01-05T15:00:00.000Z",
    end_time: "2026-01-05T15:30:00.000Z",
  },
  {
    id: "ev-2",
    title: "Quarry meeting",
    start: "2026-01-06T09:00:00.000Z",
    end: "2026-01-06T10:00:00.000Z",
    members: ["fred"],
    start_time: "2026-01-06T09:00:00.000Z",
    end_time: "2026-01-06T10:00:00.000Z",
  },
  {
    id: "ev-3",
    title: "Family bowling",
    start: "2026-01-07T19:00:00.000Z",
    end: "2026-01-07T21:00:00.000Z",
    members: ["fred", "wilma", "pebbles"],
    start_time: "2026-01-07T19:00:00.000Z",
    end_time: "2026-01-07T21:00:00.000Z",
  },
];

const recipes: Recipe[] = [
  {
    id: "rec-1",
    title: "Bronto burgers",
    source: "family",
    prep: 10,
    cook: 20,
    total: 30,
    serves: 4,
    rating: 5,
    tag: ["dinner"],
  },
  {
    id: "rec-2",
    title: "Cave-style chili",
    source: "family",
    prep: 15,
    cook: 45,
    total: 60,
    serves: 6,
    rating: 4,
    tag: ["dinner"],
  },
];

const mealPlan: MealPlan = {
  weekOf: "2026-01-05",
  rows: ["Breakfast", "Lunch", "Dinner", "Snack"],
  grid: [
    [null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null],
    ["rec-1", null, "rec-2", null, null, null, null],
    [null, null, null, null, null, null, null],
  ],
};

const shopping: Shopping = {
  weekOf: "2026-01-05",
  fromRecipes: 2,
  categories: [
    {
      name: "Produce",
      items: [
        { id: "i-1", name: "Onions", amt: "2", done: false },
        { id: "i-2", name: "Tomatoes", amt: "4", done: false },
        { id: "i-3", name: "Lettuce", amt: "1", done: true },
      ],
    },
    {
      name: "Meat",
      items: [{ id: "i-4", name: "Brontosaurus ribs", amt: "1 rack", done: false }],
    },
  ],
};

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
    member_id: "pebbles",
    name: "Tidy room",
    weight: 1,
    frequency_kind: "daily",
    days_of_week: [],
    auto_approve: false,
    archived_at: null,
    created_at: "2026-01-05T00:00:00Z",
    updated_at: "2026-01-05T00:00:00Z",
  },
  {
    id: "c-3",
    household_id: "hh1",
    member_id: "fred",
    name: "Take out trash",
    weight: 1,
    frequency_kind: "weekly",
    days_of_week: ["mon"],
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
  {
    id: "r-2",
    household_id: "hh1",
    name: "Bedtime extension",
    description: "Stay up 30 minutes later.",
    image_url: null,
    cost_points: 30,
    fulfillment_kind: "needs_approval",
    active: true,
    created_at: "2026-01-05T00:00:00Z",
    updated_at: "2026-01-05T00:00:00Z",
  },
  {
    id: "r-3",
    household_id: "hh1",
    name: "Archived",
    description: "",
    image_url: null,
    cost_points: 100,
    fulfillment_kind: "self_serve",
    active: false,
    created_at: "2026-01-05T00:00:00Z",
    updated_at: "2026-01-05T00:00:00Z",
  },
];

// ── Tests ──────────────────────────────────────────────────────────────────

describe("ClockWeatherWidget", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-05T17:34:00.000Z"));
  });
  afterEach(() => vi.useRealTimers());

  it("renders a clock and date", () => {
    render(<ClockWeatherWidget now={new Date("2026-01-05T17:34:00.000Z")} />);
    expect(screen.getByTestId("kiosk-clock-time").textContent).toBeTruthy();
    expect(screen.getByTestId("kiosk-clock-date").textContent).toBeTruthy();
  });

  it("renders provided weather temp and condition", () => {
    render(
      <ClockWeatherWidget
        now={new Date("2026-01-05T17:34:00.000Z")}
        tempF={62.4}
        conditionLabel="Cloudy"
      />
    );
    expect(screen.getByText("62°")).toBeTruthy();
    expect(screen.getByText("Cloudy")).toBeTruthy();
  });

  it("renders fallback weather slot when no data is provided", () => {
    render(<ClockWeatherWidget now={new Date("2026-01-05T17:34:00.000Z")} />);
    expect(screen.getByText("—")).toBeTruthy();
    expect(screen.getByText("Weather unavailable")).toBeTruthy();
  });
});

describe("NextEventWidget", () => {
  it("shows the upcoming event title and assignees", () => {
    render(<NextEventWidget event={events[0]} members={members} />);
    expect(screen.getByTestId("kiosk-next-event-title").textContent).toBe(
      "School pickup"
    );
    expect(screen.getByTestId("kiosk-next-event-member-fred")).toBeTruthy();
    expect(screen.getByTestId("kiosk-next-event-member-pebbles")).toBeTruthy();
  });

  it("renders an empty card when no event is provided", () => {
    render(<NextEventWidget event={undefined} members={members} />);
    expect(screen.getByTestId("kiosk-next-event-empty")).toBeTruthy();
  });
});

describe("AgendaListWidget", () => {
  it("renders each event with member dots", () => {
    render(<AgendaListWidget events={events} members={members} />);
    expect(screen.getByTestId("kiosk-agenda-item-ev-1")).toBeTruthy();
    expect(screen.getByTestId("kiosk-agenda-item-ev-2")).toBeTruthy();
    expect(screen.getByTestId("kiosk-agenda-dot-ev-1-fred")).toBeTruthy();
    expect(screen.getByTestId("kiosk-agenda-dot-ev-1-pebbles")).toBeTruthy();
  });

  it("shows an empty state when no events", () => {
    render(<AgendaListWidget events={[]} members={members} />);
    expect(screen.getByTestId("kiosk-agenda-empty")).toBeTruthy();
  });

  it("summarises overflow when events exceed limit", () => {
    render(<AgendaListWidget events={events} members={members} limit={1} />);
    expect(screen.getByTestId("kiosk-agenda-overflow").textContent).toContain(
      "+2 more"
    );
  });
});

describe("WeekCalendarWidget", () => {
  it("places ISO-dated events on the matching day cell", () => {
    render(
      <WeekCalendarWidget
        weekOf={new Date("2026-01-05T08:00:00.000Z")}
        events={events}
        members={members}
      />
    );
    expect(screen.getByTestId("kiosk-week-event-ev-1")).toBeTruthy();
    expect(screen.getByTestId("kiosk-week-event-ev-2")).toBeTruthy();
    expect(screen.getByTestId("kiosk-week-event-ev-3")).toBeTruthy();
  });

  it("renders all 7 day cells", () => {
    render(
      <WeekCalendarWidget
        weekOf={new Date("2026-01-05T08:00:00.000Z")}
        events={events}
        members={members}
      />
    );
    for (let i = 0; i < 7; i++) {
      expect(screen.getByTestId(`kiosk-week-day-${i}`)).toBeTruthy();
    }
  });

  it("shows empty state when no datable events", () => {
    render(<WeekCalendarWidget events={[]} members={members} />);
    expect(screen.getByTestId("kiosk-week-empty")).toBeTruthy();
  });
});

describe("MealStripWidget", () => {
  it("renders the dinner row with recipe titles where filled", () => {
    render(<MealStripWidget mealPlan={mealPlan} recipes={recipes} />);
    expect(screen.getByText("Bronto burgers")).toBeTruthy();
    expect(screen.getByText("Cave-style chili")).toBeTruthy();
  });

  it("renders empty when no meal plan", () => {
    render(<MealStripWidget mealPlan={undefined} recipes={recipes} />);
    expect(screen.getByTestId("kiosk-meals-empty")).toBeTruthy();
  });

  it("renders missing-row state for an unknown row", () => {
    render(
      <MealStripWidget
        mealPlan={mealPlan}
        recipes={recipes}
        rowName="Brunch"
      />
    );
    expect(screen.getByTestId("kiosk-meals-norow")).toBeTruthy();
  });
});

describe("ShoppingWidget", () => {
  it("lists open items and skips done", () => {
    render(<ShoppingWidget shopping={shopping} />);
    expect(screen.getByText("Onions")).toBeTruthy();
    expect(screen.getByText("Tomatoes")).toBeTruthy();
    expect(screen.queryByText("Lettuce")).toBeNull();
  });

  it("shows clear state when nothing is open", () => {
    render(
      <ShoppingWidget
        shopping={{
          weekOf: "2026-01-05",
          fromRecipes: 0,
          categories: [
            {
              name: "Produce",
              items: [{ id: "x", name: "Done", amt: "1", done: true }],
            },
          ],
        }}
      />
    );
    expect(screen.getByTestId("kiosk-shopping-clear")).toBeTruthy();
  });

  it("renders empty card when no shopping data", () => {
    render(<ShoppingWidget shopping={undefined} />);
    expect(screen.getByTestId("kiosk-shopping-empty")).toBeTruthy();
  });
});

describe("ChoreBoardWidget", () => {
  it("groups chores by member and excludes pets", () => {
    render(<ChoreBoardWidget chores={chores} members={members} />);
    expect(screen.getByTestId("kiosk-chores-column-fred")).toBeTruthy();
    expect(screen.getByTestId("kiosk-chores-column-pebbles")).toBeTruthy();
    expect(screen.queryByTestId("kiosk-chores-column-dino")).toBeNull();
    expect(screen.getByText("Feed Dino")).toBeTruthy();
    expect(screen.getByText("Tidy room")).toBeTruthy();
    expect(screen.getByText("Take out trash")).toBeTruthy();
  });

  it("renders empty state when no chores", () => {
    render(<ChoreBoardWidget chores={[]} members={members} />);
    expect(screen.getByTestId("kiosk-chores-empty")).toBeTruthy();
  });
});

describe("RewardsWidget", () => {
  it("only shows active rewards", () => {
    render(<RewardsWidget rewards={rewards} />);
    expect(screen.getByText("Movie night pick")).toBeTruthy();
    expect(screen.getByText("Bedtime extension")).toBeTruthy();
    expect(screen.queryByText("Archived")).toBeNull();
  });

  it("renders an empty state when no rewards are active", () => {
    render(
      <RewardsWidget rewards={rewards.filter((r) => r.id === "r-3")} />
    );
    expect(screen.getByTestId("kiosk-rewards-empty")).toBeTruthy();
  });
});

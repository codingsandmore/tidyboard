import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { FamilyList, Member, MealPlan, Recipe, TBDEvent } from "@/lib/data";
import type { ApiRoutine } from "@/lib/api/types";
import { DashKiosk } from "./dashboard-kiosk";

const mockPush = vi.fn();

const liveMembers: Member[] = [
  {
    id: "alex",
    name: "Alex",
    full: "Alex Rivera",
    role: "adult",
    color: "#2563EB",
    initial: "A",
    stars: 0,
    streak: 0,
  },
  {
    id: "mira",
    name: "Mira",
    full: "Mira Rivera",
    role: "child",
    color: "#16A34A",
    initial: "M",
    stars: 0,
    streak: 0,
  },
  {
    id: "scout",
    name: "Scout",
    full: "Scout",
    role: "pet",
    color: "#8B5CF6",
    initial: "S",
    stars: 0,
    streak: 0,
  },
];

const liveEvents: TBDEvent[] = [
  {
    id: "alex-event",
    title: "Alex dentist",
    start: "09:00",
    end: "09:30",
    members: ["alex"],
    location: "Clinic",
  },
  {
    id: "mira-event",
    title: "Mira robotics",
    start: "15:00",
    end: "16:00",
    members: ["mira"],
    location: "School",
  },
  {
    id: "family-event",
    title: "Family movie",
    start: "18:30",
    end: "20:00",
    members: ["alex", "mira"],
    location: "Living room",
  },
];

const liveRoutines: ApiRoutine[] = [
  {
    id: "routine-1",
    household_id: "hh1",
    name: "School morning",
    member_id: "mira",
    days_of_week: ["mon"],
    time_slot: "morning",
    archived: false,
    sort_order: 0,
    created_at: "2026-01-05T00:00:00Z",
    updated_at: "2026-01-05T00:00:00Z",
    steps: [
      {
        id: "step-1",
        routine_id: "routine-1",
        name: "Pack bag",
        sort_order: 0,
        created_at: "2026-01-05T00:00:00Z",
        updated_at: "2026-01-05T00:00:00Z",
      },
    ],
  },
];

const liveLists: FamilyList[] = [
  {
    id: "list-1",
    title: "Trip packing",
    category: "packing",
    emoji: "B",
    items: [{ id: "item-1", text: "Water bottles", done: false, assignee: "alex" }],
  },
];

const liveRecipes: Recipe[] = [
  {
    id: "recipe-1",
    title: "Lentil tacos",
    source: "family",
    prep: 10,
    cook: 20,
    total: 30,
    serves: 4,
    rating: 5,
    tag: ["dinner"],
  },
];

const liveMealPlan: MealPlan = {
  weekOf: "2026-01-05",
  rows: ["Breakfast", "Lunch", "Dinner", "Snack"],
  grid: [
    [null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null],
    ["recipe-1", null, null, null, null, null, null],
    [null, null, null, null, null, null, null],
  ],
};

const householdSettings = {
  weather_latitude: 40.7128,
  weather_longitude: -74.006,
};
let mockHouseholdSettings: Record<string, unknown> | undefined = householdSettings;

vi.mock("@/lib/api/hooks", () => ({
  useLiveMembers: () => ({ data: liveMembers }),
  useLiveEvents: () => ({ data: liveEvents }),
  useLiveRoutines: () => ({ data: liveRoutines }),
  useLiveLists: () => ({ data: liveLists }),
  useLiveRecipes: () => ({ data: liveRecipes }),
  useLiveMealPlan: () => ({ data: liveMealPlan }),
  useHousehold: () => ({ data: { settings: mockHouseholdSettings ?? {} } }),
}));

const mockUseWeather = vi.fn();
vi.mock("@/lib/weather/use-weather", () => ({
  useWeather: (...args: unknown[]) => mockUseWeather(...args),
}));

const mockSetActiveMember = vi.fn();
vi.mock("@/lib/auth/auth-store", () => ({
  useAuth: () => ({
    activeMember: null,
    setActiveMember: mockSetActiveMember,
    lockKiosk: vi.fn(),
    status: "authenticated",
    household: { id: "hh1", name: "Rivera household" },
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

function renderWithQuery(ui: React.ReactElement) {
  return render(ui, { wrapper: createWrapper() });
}

describe("DashKiosk", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-05T14:34:00Z"));
    mockPush.mockClear();
    mockSetActiveMember.mockClear();
    mockUseWeather.mockReturnValue({ data: { tempNow: 62, label: "Cloudy" } });
    mockHouseholdSettings = householdSettings;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders without crashing", () => {
    renderWithQuery(<DashKiosk />);
  });

  it("shows Today's schedule heading", () => {
    renderWithQuery(<DashKiosk />);
    expect(screen.getByText(/Today's schedule/i)).toBeTruthy();
  });

  it("uses the current date and time instead of static preview chrome", () => {
    renderWithQuery(<DashKiosk />);
    expect(screen.queryByText("10:34")).toBeNull();
    expect(screen.queryByText("Thursday, April 22")).toBeNull();
  });

  it("shows member names in sidebar", () => {
    renderWithQuery(<DashKiosk />);
    expect(screen.getAllByText("Alex").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Mira").length).toBeGreaterThan(0);
    expect(screen.queryByTestId("dashboard-member-scout")).toBeNull();
    expect(screen.queryByText("Scout")).toBeNull();
    expect(screen.queryByText("Dad")).toBeNull();
    expect(screen.queryByText("Mom")).toBeNull();
  });

  it("shows live events, routines, lists, meals, and weather", () => {
    renderWithQuery(<DashKiosk />);
    expect(screen.getByText("Alex dentist")).toBeTruthy();
    expect(screen.getByText("School morning")).toBeTruthy();
    expect(screen.getByText("Trip packing")).toBeTruthy();
    expect(screen.getByText("Lentil tacos")).toBeTruthy();
    expect(screen.getByText("62°")).toBeTruthy();
    expect(screen.queryByText("Spaghetti Carbonara")).toBeNull();
  });

  it("uses household weather coordinates instead of default demo coordinates", () => {
    renderWithQuery(<DashKiosk />);
    expect(mockUseWeather).toHaveBeenCalledWith(
      { lat: 40.7128, lon: -74.006 },
      { enabled: true }
    );
  });

  it("suppresses weather instead of using demo coordinates when household has no location", () => {
    mockHouseholdSettings = undefined;
    mockUseWeather.mockReturnValue({ data: undefined });
    renderWithQuery(<DashKiosk />);
    expect(mockUseWeather).toHaveBeenCalledWith(undefined, { enabled: false });
    expect(screen.getByText("Weather unavailable")).toBeTruthy();
  });

  it("switches selected member on click", () => {
    renderWithQuery(<DashKiosk />);
    const alexLabels = screen.getAllByText("Alex");
    fireEvent.click(alexLabels[0]);
    expect(screen.getByText(/Today's schedule/i)).toBeTruthy();
  });

  it("clicking a member tile calls setActiveMember with that member", () => {
    renderWithQuery(<DashKiosk />);
    const alexTile = screen.getByTestId("dashboard-member-alex");
    fireEvent.click(alexTile);
    expect(mockSetActiveMember).toHaveBeenCalledWith(
      expect.objectContaining({ id: "alex" })
    );
  });

  it("clicking a member tile filters in place without leaving the dashboard", () => {
    renderWithQuery(<DashKiosk />);
    fireEvent.click(screen.getByTestId("dashboard-member-alex"));
    expect(mockPush).not.toHaveBeenCalled();
    expect(screen.getByText("Alex dentist")).toBeTruthy();
    expect(screen.queryByText("Mira robotics")).toBeNull();
  });

  it("filters selected-member events while keeping shared events visible", () => {
    renderWithQuery(<DashKiosk />);
    fireEvent.click(screen.getByTestId("dashboard-member-alex"));
    expect(screen.getByText("Alex dentist")).toBeTruthy();
    expect(screen.getByText("Family movie")).toBeTruthy();
    expect(screen.queryByText("Mira robotics")).toBeNull();
  });

  it("clicking an event opens the calendar detail route for that event", () => {
    renderWithQuery(<DashKiosk />);
    fireEvent.click(screen.getByText("Alex dentist"));
    expect(mockPush).toHaveBeenCalledWith("/calendar?event=alex-event");
  });

  it("renders in dark mode without static preview content", () => {
    renderWithQuery(<DashKiosk dark />);
    expect(screen.queryByText("10:34")).toBeNull();
  });
});

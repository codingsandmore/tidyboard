import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AdaptiveDashboard } from "./adaptive-dashboard";

const members = [
  {
    id: "adult-1",
    name: "Taylor",
    full: "Taylor Rivera",
    role: "adult",
    color: "#2563eb",
    initial: "T",
    avatar: "T",
    stars: 0,
    streak: 0,
  },
];

const events = [
  {
    id: "event-1",
    title: "School pickup",
    start: "2026-04-30T15:00:00.000Z",
    end: "2026-04-30T15:30:00.000Z",
    color: "#2563eb",
    location: "Main entrance",
    members: ["adult-1"],
  },
];

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useSearchParams: () => ({ get: () => null }),
  usePathname: () => "/",
}));

vi.mock("@/lib/api/hooks", () => ({
  useMembers: () => ({ data: members }),
  useEvents: () => ({ data: events }),
  useLiveMembers: () => ({ data: members }),
  useLiveEvents: () => ({ data: events }),
  useLiveRoutines: () => ({ data: [] }),
  useLiveLists: () => ({ data: [] }),
  useLiveRecipes: () => ({ data: [] }),
  useLiveMealPlan: () => ({ data: null }),
  useHousehold: () => ({ data: { name: "Rivera household", settings: {} } }),
  useRedemptions: () => ({ data: [] }),
  useAdHocTasks: () => ({ data: [] }),
  useScoreboard: () => ({ data: [] }),
  usePointCategories: () => ({ data: [] }),
}));

vi.mock("@/lib/weather/use-weather", () => ({
  useWeather: () => ({ data: null }),
}));

vi.mock("@/lib/auth/auth-store", () => ({
  useAuth: () => ({
    activeMember: null,
    setActiveMember: vi.fn(),
    household: { id: "household-1", name: "Rivera household" },
    status: "authenticated",
  }),
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

describe("AdaptiveDashboard", () => {
  it("renders without crashing", () => {
    renderWithQuery(<AdaptiveDashboard />);
  });

  it("renders all three variant divs", () => {
    const { container } = renderWithQuery(<AdaptiveDashboard />);
    expect(container.querySelector(".tb-variant-phone")).toBeTruthy();
    expect(container.querySelector(".tb-variant-kiosk")).toBeTruthy();
    expect(container.querySelector(".tb-variant-desktop")).toBeTruthy();
  });

  it("renders tidyboard brand text (from at least one variant)", () => {
    const { getAllByText } = renderWithQuery(<AdaptiveDashboard />);
    // All 3 variants render "tidyboard" — at least one should exist
    expect(getAllByText("tidyboard").length).toBeGreaterThanOrEqual(1);
  });
});

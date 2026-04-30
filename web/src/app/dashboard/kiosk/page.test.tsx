import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Member, TBDEvent } from "@/lib/data";
import KioskDashboardPage from "./page";

const members: Member[] = [
  { id: "alex", name: "Alex", full: "Alex Rivera", role: "adult", color: "#2563EB", initial: "A", stars: 0, streak: 0 },
];

const events: TBDEvent[] = [
  { id: "event-1", title: "Real appointment", start: "09:00", end: "09:30", members: ["alex"] },
];

vi.mock("@/lib/api/hooks", () => ({
  useLiveMembers: () => ({ data: members }),
  useLiveEvents: () => ({ data: events }),
  useLiveRoutines: () => ({ data: [] }),
  useLiveLists: () => ({ data: [] }),
  useLiveRecipes: () => ({ data: [] }),
  useLiveMealPlan: () => ({ data: undefined }),
  useHousehold: () => ({ data: { settings: {} } }),
}));

vi.mock("@/lib/weather/use-weather", () => ({
  useWeather: () => ({ data: undefined }),
}));

vi.mock("@/lib/auth/auth-store", () => ({
  useAuth: () => ({
    activeMember: null,
    setActiveMember: vi.fn(),
    lockKiosk: vi.fn(),
    status: "authenticated",
    household: { id: "hh1", name: "Rivera household" },
  }),
}));

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <KioskDashboardPage />
    </QueryClientProvider>
  );
}

describe("/dashboard/kiosk", () => {
  it("renders the kiosk as the real full-screen interface without preview chrome", () => {
    const { container } = renderPage();

    expect(screen.getByText("Real appointment")).toBeTruthy();
    expect(screen.queryByText("Dashboard · kiosk V1 · timeline")).toBeNull();
    expect(screen.queryByText(/tidyboard · family dashboard/i)).toBeNull();
    expect(container.firstElementChild).toHaveAttribute("data-testid", "kiosk-dashboard-page");
    expect(container.firstElementChild).toHaveStyle({ height: "100vh" });
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TBD } from "@/lib/data";
import { Equity, EquityScales, Settings, Race, arc } from "./equity";

const mockPush = vi.fn();
const mockLogout = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn(), back: vi.fn() }),
  useSearchParams: () => ({ get: () => null }),
  usePathname: () => "/",
}));

vi.mock("@/lib/auth/auth-store", () => ({
  useAuth: () => ({ logout: mockLogout, member: null, household: null, status: "authenticated", account: null }),
}));

// Mutable refs the tests can override per-suite to simulate hook responses.
const mockContribution: { current: unknown } = { current: undefined };
const mockHousekeeper: { current: unknown } = { current: undefined };

vi.mock("@/lib/api/hooks", () => ({
  useEquity: () => ({ data: TBD.equity }),
  useRace: () => ({ data: TBD.race }),
  // New equity engine hooks — return undefined so the component falls back to stub data
  useEquityDashboard: () => ({ data: undefined }),
  useRebalanceSuggestions: () => ({ data: undefined }),
  useMembers: () => ({ data: TBD.members }),
  useEquityContribution: () => ({ data: mockContribution.current }),
  useHousekeeperEstimate: () => ({ data: mockHousekeeper.current }),
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

describe("arc helper", () => {
  it("returns a string path", () => {
    const result = arc(0, 0.5, 60);
    expect(typeof result).toBe("string");
    expect(result.startsWith("M 0 0")).toBe(true);
  });

  it("handles full arc (> 0.5)", () => {
    const result = arc(0, 0.75, 60);
    expect(result).toContain("A");
  });
});

describe("Equity", () => {
  it("renders without crashing", () => {
    renderWithQuery(<Equity />);
  });

  it("shows Household balance heading", () => {
    renderWithQuery(<Equity />);
    expect(screen.getByText("Household balance")).toBeTruthy();
  });

  it("shows Domain ownership card", () => {
    renderWithQuery(<Equity />);
    expect(screen.getByText("Domain ownership")).toBeTruthy();
  });

  it("shows Load indicator card", () => {
    renderWithQuery(<Equity />);
    expect(screen.getByText("Load indicator")).toBeTruthy();
  });

  it("renders in dark mode without crashing", () => {
    renderWithQuery(<Equity dark />);
    expect(screen.getByText("Household balance")).toBeTruthy();
  });
});

describe("EquityScales", () => {
  it("renders without crashing", () => {
    render(<EquityScales />);
  });

  it("shows The balance heading", () => {
    render(<EquityScales />);
    expect(screen.getByText("The balance")).toBeTruthy();
  });

  it("shows hour weights", () => {
    render(<EquityScales />);
    expect(screen.getByText("18h")).toBeTruthy();
    expect(screen.getByText("14h")).toBeTruthy();
  });
});

describe("Settings", () => {
  it("renders without crashing", () => {
    render(<Settings />);
  });

  it("shows Settings heading", () => {
    render(<Settings />);
    expect(screen.getByText("Settings")).toBeTruthy();
  });

  it("shows Household group item", () => {
    render(<Settings />);
    expect(screen.getByText("Household")).toBeTruthy();
  });

  it("shows Sign out button", () => {
    render(<Settings />);
    expect(screen.getByText("Sign out")).toBeTruthy();
  });
});

describe("Race", () => {
  it("renders without crashing", () => {
    renderWithQuery(<Race />);
  });

  it("shows race name", () => {
    renderWithQuery(<Race />);
    expect(screen.getByText("Kitchen Clean-Up Race!")).toBeTruthy();
  });

  it("shows race tasks", () => {
    renderWithQuery(<Race />);
    expect(screen.getByText("Clear table")).toBeTruthy();
    expect(screen.getByText("Rinse dishes")).toBeTruthy();
  });

  it("shows participant names", () => {
    renderWithQuery(<Race />);
    expect(screen.getByText("Jackson")).toBeTruthy();
    expect(screen.getByText("Emma")).toBeTruthy();
  });
});

describe("Equity — Contribution tab", () => {
  beforeEach(() => {
    mockContribution.current = undefined;
    mockHousekeeper.current = undefined;
  });

  it("renders a Contribution tab control", () => {
    renderWithQuery(<Equity />);
    expect(screen.getByRole("tab", { name: /contribution/i })).toBeTruthy();
  });

  it("switching to Contribution renders per-member bars with hours and percentage", () => {
    mockContribution.current = [
      { member_id: "mom", total_minutes: 18 * 60, percentage_minutes: 56 },
      { member_id: "dad", total_minutes: 14 * 60, percentage_minutes: 44 },
    ];
    renderWithQuery(<Equity />);
    fireEvent.click(screen.getByRole("tab", { name: /contribution/i }));
    // Member rows
    expect(screen.getByTestId("contribution-bar-mom")).toBeTruthy();
    expect(screen.getByTestId("contribution-bar-dad")).toBeTruthy();
    // Hours rendered (18h, 14h)
    expect(screen.getAllByText(/18\.0h|18h/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/14\.0h|14h/).length).toBeGreaterThan(0);
    // Percentage rendered (56% / 44%)
    expect(screen.getByText(/56%/)).toBeTruthy();
    expect(screen.getByText(/44%/)).toBeTruthy();
  });

  it("renders dollar band when total_cents_min/max are present", () => {
    mockContribution.current = [
      {
        member_id: "mom",
        total_minutes: 18 * 60,
        percentage_minutes: 56,
        total_cents_min: 36000, // $360
        total_cents_max: 54000, // $540
        percentage_cents: 60,
      },
      { member_id: "dad", total_minutes: 14 * 60, percentage_minutes: 44 },
    ];
    renderWithQuery(<Equity />);
    fireEvent.click(screen.getByRole("tab", { name: /contribution/i }));
    expect(screen.getByText(/\$360.*\$540|\$360–\$540|\$360 – \$540/)).toBeTruthy();
  });

  it("shows rebalance suggestion when an adult exceeds 70% of contribution-by-minutes", () => {
    mockContribution.current = [
      { member_id: "mom", total_minutes: 30 * 60, percentage_minutes: 75 },
      { member_id: "dad", total_minutes: 10 * 60, percentage_minutes: 25 },
    ];
    renderWithQuery(<Equity />);
    fireEvent.click(screen.getByRole("tab", { name: /contribution/i }));
    expect(
      screen.getByText(/consider rebalancing|rebalance|over.?loaded|carrying/i),
    ).toBeTruthy();
  });

  it("does NOT show rebalance suggestion when contribution is balanced", () => {
    mockContribution.current = [
      { member_id: "mom", total_minutes: 18 * 60, percentage_minutes: 56 },
      { member_id: "dad", total_minutes: 14 * 60, percentage_minutes: 44 },
    ];
    renderWithQuery(<Equity />);
    fireEvent.click(screen.getByRole("tab", { name: /contribution/i }));
    expect(screen.queryByText(/consider rebalancing/i)).toBeNull();
  });
});

describe("Equity — Housekeeper card", () => {
  beforeEach(() => {
    mockContribution.current = [
      { member_id: "mom", total_minutes: 18 * 60, percentage_minutes: 56 },
      { member_id: "dad", total_minutes: 14 * 60, percentage_minutes: 44 },
    ];
    mockHousekeeper.current = undefined;
  });

  it("renders the Housekeeper card with total estimated cost in dollars", () => {
    mockHousekeeper.current = {
      from: "2026-04-20",
      to: "2026-04-26",
      total_estimated_cost_cents: 12500, // $125.00
      categories: [
        {
          category: "Cooking",
          total_minutes: 240,
          hourly_rate_cents: 2500,
          estimated_cost_cents: 10000,
        },
        {
          category: "Cleaning",
          total_minutes: 60,
          hourly_rate_cents: 2500,
          estimated_cost_cents: 2500,
        },
      ],
    };
    renderWithQuery(<Equity />);
    fireEvent.click(screen.getByRole("tab", { name: /contribution/i }));
    expect(screen.getByText(/housekeeper/i)).toBeTruthy();
    // Whole-dollar formatting (no cents in headline)
    expect(screen.getByText(/\$125/)).toBeTruthy();
    // Per-category line
    expect(screen.getByText(/cooking/i)).toBeTruthy();
    expect(screen.getByText(/cleaning/i)).toBeTruthy();
  });

  it("shows nothing extra when housekeeper estimate is unavailable", () => {
    renderWithQuery(<Equity />);
    fireEvent.click(screen.getByRole("tab", { name: /contribution/i }));
    expect(screen.queryByText(/housekeeper/i)).toBeNull();
  });
});

describe("Settings — wired buttons", () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockLogout.mockClear();
  });

  it("Sign Out calls logout and navigates to /login", () => {
    renderWithQuery(<Settings />);
    fireEvent.click(screen.getByText("Sign out"));
    expect(mockLogout).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith("/login");
  });

  it("Delete Household button is rendered as a disabled control (no confirm/alert flow)", () => {
    // The endpoint isn't implemented yet, so the button is intentionally
    // disabled — clicking it must NOT pop a confirm or alert dialog.
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    renderWithQuery(<Settings />);
    const btn = screen.getByText("Delete household…").closest("button");
    expect(btn).not.toBeNull();
    expect(btn).toBeDisabled();
    fireEvent.click(btn!);
    expect(confirmSpy).not.toHaveBeenCalled();
    expect(alertSpy).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
    alertSpy.mockRestore();
  });
});

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

vi.mock("@/lib/api/hooks", () => ({
  useEquity: () => ({ data: TBD.equity }),
  useRace: () => ({ data: TBD.race }),
  // New equity engine hooks — return undefined so the component falls back to stub data
  useEquityDashboard: () => ({ data: undefined }),
  useRebalanceSuggestions: () => ({ data: undefined }),
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

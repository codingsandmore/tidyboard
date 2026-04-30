import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import CalendarPage from "./page";

// Mock heavy calendar screen components to avoid OOM in test environment
vi.mock("@/components/screens/calendar", () => ({
  CalDay: () => <div data-testid="cal-day">CalDay</div>,
  CalWeek: () => <div data-testid="cal-week">CalWeek</div>,
  CalMonth: () => <div data-testid="cal-month">CalMonth</div>,
  CalAgenda: () => <div data-testid="cal-agenda">CalAgenda</div>,
  EventModal: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="event-modal">
      <button onClick={onClose}>Cancel</button>
      <button>Save</button>
    </div>
  ),
}));

vi.mock("@/components/theme-provider", () => ({
  useTheme: () => ({ theme: "light" }),
}));

let mockNewParam: string | null = null;

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useSearchParams: () => ({ get: (k: string) => k === "new" ? mockNewParam : null }),
  usePathname: () => "/calendar",
}));

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

function renderPage() {
  return render(<CalendarPage />, { wrapper: createWrapper() });
}

describe("CalendarPage", () => {
  it("renders without crashing", () => {
    mockNewParam = null;
    renderPage();
  });

  it("does NOT open EventModal when no ?new=event param", () => {
    mockNewParam = null;
    renderPage();
    expect(screen.queryByTestId("event-modal")).toBeNull();
  });

  it("opens EventModal when ?new=event is present", () => {
    mockNewParam = "event";
    renderPage();
    expect(screen.getByTestId("event-modal")).toBeTruthy();
  });
});

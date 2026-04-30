import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import CalendarPage from "./page";
import type { EventFormData } from "@/components/screens/calendar";

const liveEvent = {
  id: "evt-live",
  title: "Piano recital",
  start_time: "2026-01-05T18:00:00Z",
  end_time: "2026-01-05T19:00:00Z",
  location: "Community Hall",
  description: "Bring sheet music.",
  members: ["alex"],
};

// Mock heavy calendar screen components to avoid OOM in test environment
vi.mock("@/components/screens/calendar", () => ({
  CalDay: ({ onEventOpen }: { onEventOpen?: (event: EventFormData) => void }) => (
    <button data-testid="cal-day-event" onClick={() => onEventOpen?.(liveEvent)}>
      CalDay event
    </button>
  ),
  CalWeek: () => <div data-testid="cal-week">CalWeek</div>,
  CalMonth: () => <div data-testid="cal-month">CalMonth</div>,
  CalAgenda: () => <div data-testid="cal-agenda">CalAgenda</div>,
  EventModal: ({ event, onClose }: { event?: EventFormData; onClose: () => void }) => (
    <div data-testid="event-modal">
      <div data-testid="event-modal-title">{event?.title ?? "New event"}</div>
      <button onClick={onClose}>Cancel</button>
      <button>Save</button>
    </div>
  ),
}));

vi.mock("@/lib/api/hooks", () => ({
  useLiveEvent: (id?: string) => ({ data: id === liveEvent.id ? liveEvent : undefined }),
}));

vi.mock("@/components/theme-provider", () => ({
  useTheme: () => ({ theme: "light" }),
}));

let mockNewParam: string | null = null;
let mockEventParam: string | null = null;

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useSearchParams: () => ({
    get: (k: string) => {
      if (k === "new") return mockNewParam;
      if (k === "event") return mockEventParam;
      return null;
    },
  }),
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
    mockEventParam = null;
    renderPage();
  });

  it("does NOT open EventModal when no ?new=event param", () => {
    mockNewParam = null;
    mockEventParam = null;
    renderPage();
    expect(screen.queryByTestId("event-modal")).toBeNull();
  });

  it("opens EventModal when ?new=event is present", () => {
    mockNewParam = "event";
    mockEventParam = null;
    renderPage();
    expect(screen.getByTestId("event-modal")).toBeTruthy();
  });

  it("opens the matching event detail modal from ?event=id", () => {
    mockNewParam = null;
    mockEventParam = "evt-live";
    renderPage();
    expect(screen.getByTestId("event-modal-title").textContent).toBe("Piano recital");
  });

  it("opens the event detail modal when a calendar view reports an event click", () => {
    mockNewParam = null;
    mockEventParam = null;
    renderPage();
    fireEvent.click(screen.getByTestId("cal-day-event"));
    expect(screen.getByTestId("event-modal-title").textContent).toBe("Piano recital");
  });
});

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TBD } from "@/lib/data";
import { CalDay, CalWeek, CalMonth, CalAgenda, EventModal } from "./calendar";

vi.mock("@/lib/api/hooks", () => ({
  useMembers: () => ({ data: TBD.members }),
  useEvents: (_range?: unknown) => ({ data: TBD.events }),
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

describe("CalDay", () => {
  it("renders without crashing", () => {
    renderWithQuery(<CalDay />);
  });

  it("shows Thursday April 22", () => {
    renderWithQuery(<CalDay />);
    expect(screen.getByText("Thursday, April 22")).toBeTruthy();
  });

  it("shows member columns", () => {
    renderWithQuery(<CalDay />);
    expect(screen.getAllByText("Dad").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Mom").length).toBeGreaterThan(0);
  });

  it("renders dark mode without crashing", () => {
    renderWithQuery(<CalDay dark />);
    expect(screen.getByText("Thursday, April 22")).toBeTruthy();
  });
});

describe("CalDay (tab interaction)", () => {
  it("clicking a view tab does not crash", () => {
    renderWithQuery(<CalDay />);
    // ViewTabs renders Day/Week/Month/Agenda — click Week tab to invoke onChange
    const weekBtn = screen.getByText("Week");
    fireEvent.click(weekBtn);
    expect(screen.getByText("Thursday, April 22")).toBeTruthy();
  });
});

describe("CalWeek", () => {
  it("renders without crashing", () => {
    render(<CalWeek />);
  });

  it("shows week date range", () => {
    render(<CalWeek />);
    expect(screen.getByText(/Apr 19/)).toBeTruthy();
  });

  it("shows day names", () => {
    render(<CalWeek />);
    expect(screen.getByText("MON")).toBeTruthy();
    expect(screen.getByText("THU")).toBeTruthy();
  });
});

describe("CalMonth", () => {
  it("renders without crashing", () => {
    render(<CalMonth />);
  });

  it("shows April 2026 heading", () => {
    render(<CalMonth />);
    expect(screen.getByText("April 2026")).toBeTruthy();
  });

  it("shows day-of-week headers", () => {
    render(<CalMonth />);
    expect(screen.getByText("SUN")).toBeTruthy();
    expect(screen.getByText("SAT")).toBeTruthy();
  });
});

describe("CalAgenda", () => {
  it("renders without crashing", () => {
    renderWithQuery(<CalAgenda />);
  });

  it("shows Agenda heading", () => {
    renderWithQuery(<CalAgenda />);
    expect(screen.getAllByText("Agenda").length).toBeGreaterThan(0);
  });

  it("shows today's label", () => {
    renderWithQuery(<CalAgenda />);
    expect(screen.getByText(/TODAY/)).toBeTruthy();
  });

  it("shows event titles", () => {
    renderWithQuery(<CalAgenda />);
    expect(screen.getByText("Morning standup")).toBeTruthy();
  });
});

describe("EventModal", () => {
  it("renders without crashing", () => {
    renderWithQuery(<EventModal />);
  });

  it("shows event title", () => {
    renderWithQuery(<EventModal />);
    expect(screen.getByDisplayValue("Dentist — Jackson")).toBeTruthy();
  });

  it("shows location", () => {
    renderWithQuery(<EventModal />);
    expect(screen.getByText("Dr. Patel, Market St")).toBeTruthy();
  });

  it("shows Save button", () => {
    renderWithQuery(<EventModal />);
    expect(screen.getByText("Save")).toBeTruthy();
  });
});

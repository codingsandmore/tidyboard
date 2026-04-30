import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TBD } from "@/lib/data";
import { DashPhone } from "./dashboard-phone";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/lib/api/hooks", () => ({
  useMembers: () => ({ data: TBD.members }),
  useEvents: () => ({ data: TBD.events }),
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

describe("DashPhone", () => {
  it("renders without crashing", () => {
    renderWithQuery(<DashPhone />);
  });

  it("shows tidyboard logo", () => {
    renderWithQuery(<DashPhone />);
    expect(screen.getByText("tidyboard")).toBeTruthy();
  });

  it("shows the current weekday heading", () => {
    renderWithQuery(<DashPhone />);
    const weekday = new Intl.DateTimeFormat(undefined, { weekday: "long" }).format(new Date());
    expect(screen.getByText(weekday)).toBeTruthy();
  });

  it("shows the current date and real event count", () => {
    renderWithQuery(<DashPhone />);
    const dateLabel = new Intl.DateTimeFormat(undefined, { month: "long", day: "numeric" }).format(new Date());
    expect(screen.getByText(new RegExp(dateLabel))).toBeTruthy();
  });

  it("shows at least one event", () => {
    renderWithQuery(<DashPhone />);
    expect(screen.getByText("Morning standup")).toBeTruthy();
  });

  it("clicking an event navigates to its calendar detail route", () => {
    mockPush.mockClear();
    renderWithQuery(<DashPhone />);
    fireEvent.click(screen.getByText("Morning standup"));
    expect(mockPush).toHaveBeenCalledWith("/calendar?event=e1");
  });

  it("does not show sample dinner data", () => {
    renderWithQuery(<DashPhone />);
    expect(screen.queryByText("Spaghetti Carbonara")).toBeNull();
    expect(screen.getByText("No dinner planned")).toBeTruthy();
  });
});

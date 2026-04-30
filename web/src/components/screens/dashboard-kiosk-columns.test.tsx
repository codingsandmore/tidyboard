import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TBD } from "@/lib/data";
import { DashKioskColumns } from "./dashboard-kiosk-columns";

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

describe("DashKioskColumns", () => {
  it("renders without crashing", () => {
    renderWithQuery(<DashKioskColumns />);
  });

  it("shows Thursday heading", () => {
    renderWithQuery(<DashKioskColumns />);
    expect(screen.getByText("Thursday")).toBeTruthy();
  });

  it("shows member column headers", () => {
    renderWithQuery(<DashKioskColumns />);
    expect(screen.getAllByText("Dad").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Mom").length).toBeGreaterThan(0);
  });

  it("shows Add Event button", () => {
    renderWithQuery(<DashKioskColumns />);
    expect(screen.getByText("Event")).toBeTruthy();
  });
});

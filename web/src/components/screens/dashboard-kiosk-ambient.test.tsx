import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TBD } from "@/lib/data";
import { DashKioskAmbient } from "./dashboard-kiosk-ambient";

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

describe("DashKioskAmbient", () => {
  it("renders without crashing", () => {
    renderWithQuery(<DashKioskAmbient />);
  });

  it("shows clock time", () => {
    renderWithQuery(<DashKioskAmbient />);
    expect(screen.getByText("10:34")).toBeTruthy();
  });

  it("shows NEXT UP text", () => {
    renderWithQuery(<DashKioskAmbient />);
    expect(screen.getByText(/NEXT UP/)).toBeTruthy();
  });

  it("shows family member tiles", () => {
    renderWithQuery(<DashKioskAmbient />);
    expect(screen.getByText("Dad")).toBeTruthy();
    expect(screen.getByText("Mom")).toBeTruthy();
  });

  it("shows dinner recipe", () => {
    renderWithQuery(<DashKioskAmbient />);
    expect(screen.getByText("Spaghetti Carbonara")).toBeTruthy();
  });
});

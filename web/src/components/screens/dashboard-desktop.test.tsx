import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DashDesktop } from "./dashboard-desktop";

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

function renderWithQuery(ui: React.ReactElement) {
  return render(ui, { wrapper: createWrapper() });
}

describe("DashDesktop", () => {
  it("renders without crashing", () => {
    renderWithQuery(<DashDesktop />);
  });

  it("shows tidyboard brand name", () => {
    renderWithQuery(<DashDesktop />);
    expect(screen.getByText("tidyboard")).toBeTruthy();
  });

  it("shows Today heading", () => {
    renderWithQuery(<DashDesktop />);
    expect(screen.getByText(/Today, April 22/)).toBeTruthy();
  });

  it("shows navigation items", () => {
    renderWithQuery(<DashDesktop />);
    expect(screen.getByText("Calendar")).toBeTruthy();
    expect(screen.getByText("Settings")).toBeTruthy();
  });

  it("shows all family members in sidebar", () => {
    renderWithQuery(<DashDesktop />);
    expect(screen.getByText("Dad")).toBeTruthy();
    expect(screen.getByText("Mom")).toBeTruthy();
  });

  it("shows events in the main list", () => {
    renderWithQuery(<DashDesktop />);
    expect(screen.getByText("Morning standup")).toBeTruthy();
  });
});

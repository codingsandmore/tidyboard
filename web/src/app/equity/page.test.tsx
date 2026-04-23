import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import EquityPage from "./page";

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

function renderWithQuery(ui: React.ReactElement) {
  return render(ui, { wrapper: createWrapper() });
}

describe("EquityPage", () => {
  it("renders without crashing", () => {
    const { container } = renderWithQuery(<EquityPage />);
    expect(container).toBeTruthy();
  });

  it("shows Equity tab by default", () => {
    renderWithQuery(<EquityPage />);
    expect(screen.getByText("Equity")).toBeTruthy();
    expect(screen.getByText("Household balance")).toBeTruthy();
  });

  it("switches to Scales view on tab click", () => {
    renderWithQuery(<EquityPage />);
    fireEvent.click(screen.getByText("Scales"));
    expect(screen.getByText("The balance")).toBeTruthy();
  });
});

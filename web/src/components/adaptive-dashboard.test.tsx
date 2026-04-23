import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AdaptiveDashboard } from "./adaptive-dashboard";

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

function renderWithQuery(ui: React.ReactElement) {
  return render(ui, { wrapper: createWrapper() });
}

describe("AdaptiveDashboard", () => {
  it("renders without crashing", () => {
    renderWithQuery(<AdaptiveDashboard />);
  });

  it("renders all three variant divs", () => {
    const { container } = renderWithQuery(<AdaptiveDashboard />);
    expect(container.querySelector(".tb-variant-phone")).toBeTruthy();
    expect(container.querySelector(".tb-variant-kiosk")).toBeTruthy();
    expect(container.querySelector(".tb-variant-desktop")).toBeTruthy();
  });

  it("renders tidyboard brand text (from at least one variant)", () => {
    const { getAllByText } = renderWithQuery(<AdaptiveDashboard />);
    // All 3 variants render "tidyboard" — at least one should exist
    expect(getAllByText("tidyboard").length).toBeGreaterThanOrEqual(1);
  });
});

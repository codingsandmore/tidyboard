import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Timeline } from "./timeline";

vi.mock("@/lib/api/hooks", () => ({
  useTimeline: () => ({
    data: [
      { kind: "point_grant", id: "g1", occurred_at: new Date().toISOString(), amount: 3, reason: "Helped Theo", ref_a: "b1", ref_b: null },
      { kind: "wallet_transaction", id: "t1", occurred_at: new Date().toISOString(), amount: 30, reason: "Brush teeth", ref_a: null, ref_b: null },
    ],
    isLoading: false,
  }),
}));

function renderWithQuery(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe("Timeline", () => {
  it("renders heading + fallback events", async () => {
    renderWithQuery(<Timeline memberId="m1" />);
    expect(await screen.findByText(/Timeline/i)).toBeInTheDocument();
    expect(screen.getByText("Helped Theo")).toBeInTheDocument();
    expect(screen.getByText("Brush teeth")).toBeInTheDocument();
  });
});

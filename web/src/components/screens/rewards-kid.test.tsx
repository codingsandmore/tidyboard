import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RewardsKid } from "./rewards-kid";

vi.mock("@/lib/api/hooks", () => ({
  useRewards: () => ({
    data: [
      { id: "r1", household_id: "h1", name: "Stickers", description: "Sheet of stickers", image_url: null, cost_points: 30, fulfillment_kind: "self_serve", active: true, created_at: "", updated_at: "" },
    ],
  }),
  usePointsBalance: () => ({
    data: { total: 50, breakdown: [] },
  }),
  useRedeemReward: () => ({ mutateAsync: vi.fn() }),
  useSetSavingsGoal: () => ({ mutateAsync: vi.fn() }),
}));

function renderWithQuery(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe("RewardsKid", () => {
  it("renders heading + at least one fallback reward", async () => {
    renderWithQuery(<RewardsKid memberId="m1" />);
    expect(await screen.findByText(/Rewards/i)).toBeInTheDocument();
    expect(await screen.findByText("Stickers")).toBeInTheDocument();
  });
});

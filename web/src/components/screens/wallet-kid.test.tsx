import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WalletKid } from "./wallet-kid";

vi.mock("@/lib/api/hooks", () => ({
  useWallet: () => ({
    data: {
      wallet: { id: "w1", member_id: "kid1", balance_cents: 4230, updated_at: "" },
      transactions: [
        { id: "t1", wallet_id: "w1", member_id: "kid1", amount_cents: 30,  kind: "chore_payout", reference_id: null, reason: "Brush teeth",       created_at: new Date(Date.now() - 3 * 3600 * 1000).toISOString() },
        { id: "t2", wallet_id: "w1", member_id: "kid1", amount_cents: 250, kind: "tip",          reference_id: null, reason: "Helping w/ groceries", created_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString() },
      ],
    },
  }),
  useMembers: () => ({ data: [{ id: "kid1", name: "Sarah", color: "#22C55E", role: "child" }] }),
}));

function renderWithQuery(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe("WalletKid", () => {
  it("shows the kid's balance prominently", () => {
    renderWithQuery(<WalletKid memberId="kid1" />);
    expect(screen.getByText("$42.30")).toBeInTheDocument();
  });
  it("lists recent transactions with reasons", () => {
    renderWithQuery(<WalletKid memberId="kid1" />);
    expect(screen.getByText("Brush teeth")).toBeInTheDocument();
    expect(screen.getByText("Helping w/ groceries")).toBeInTheDocument();
  });
  it("uses member color for the balance", () => {
    renderWithQuery(<WalletKid memberId="kid1" />);
    const balance = screen.getByText("$42.30");
    expect(balance).toHaveStyle({ color: "rgb(34, 197, 94)" });
  });
});

/**
 * Issue #145 — chores-kid wallet flow reflects payout.
 *
 * Spec: docs/specs/2026-05-01-fairplay-design.md §C.4
 *
 * Contract: when `useMarkChoreComplete` succeeds, the
 * `useWallet(memberId)` query MUST refetch so the displayed
 * balance reflects the payout that the backend (#137) wrote
 * into wallet_transactions.
 *
 * This test exercises the boundary at the network level: a
 * wallet GET, a chore-complete POST, and a second wallet GET
 * triggered by query invalidation.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useMarkChoreComplete, useWallet } from "./hooks";

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  return { qc, Wrapper };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("useMarkChoreComplete — wallet refetch on payout (#145)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("refetches wallet balance after chore completion succeeds", async () => {
    // First wallet GET → 50 stones; complete POST → 200; second wallet GET → 60 stones.
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : (input as Request).url ?? String(input);
      if (url.includes("/v1/wallet/kid1")) {
        const callsForWallet = fetchMock.mock.calls.filter((c) => {
          const u = typeof c[0] === "string" ? c[0] : (c[0] as Request).url ?? String(c[0]);
          return u.includes("/v1/wallet/kid1");
        }).length;
        // The current call is already counted in mock.calls when this function runs.
        if (callsForWallet <= 1) {
          return jsonResponse({
            wallet: {
              id: "w1",
              household_id: "h1",
              member_id: "kid1",
              balance_cents: 5000,
              created_at: "",
              updated_at: "",
            },
            transactions: [],
          });
        }
        return jsonResponse({
          wallet: {
            id: "w1",
            household_id: "h1",
            member_id: "kid1",
            balance_cents: 6000,
            created_at: "",
            updated_at: "",
          },
          transactions: [],
        });
      }
      if (url.includes("/v1/chores/c1/complete")) {
        return jsonResponse({
          id: "cc1",
          chore_id: "c1",
          member_id: "kid1",
          date: "2026-04-30",
          marked_at: "2026-04-30T12:00:00Z",
          approved: true,
          payout_cents: 1000,
          closed: false,
        });
      }
      throw new Error(`unexpected fetch ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const { Wrapper } = makeWrapper();

    const wallet = renderHook(() => useWallet("kid1"), { wrapper: Wrapper });
    const mark = renderHook(() => useMarkChoreComplete(), { wrapper: Wrapper });

    await waitFor(() => expect(wallet.result.current.data?.wallet.balance_cents).toBe(5000));

    await act(async () => {
      await mark.result.current.mutateAsync({ choreId: "c1", date: "2026-04-30" });
    });

    await waitFor(() =>
      expect(wallet.result.current.data?.wallet.balance_cents).toBe(6000)
    );

    const walletCalls = fetchMock.mock.calls.filter((c) => {
      const u = typeof c[0] === "string" ? c[0] : (c[0] as Request).url ?? String(c[0]);
      return u.includes("/v1/wallet/kid1");
    });
    expect(walletCalls.length).toBeGreaterThanOrEqual(2);
  });
});

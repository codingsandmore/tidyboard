import { afterEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useEvents, useHousehold, useMembers } from "./hooks";

function wrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

describe("production API hooks", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("surfaces backend failures instead of returning Smith sample members", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("backend unavailable")));

    const members = renderHook(() => useMembers(), { wrapper: wrapper() });

    await waitFor(() => expect(members.result.current.isError).toBe(true));
    expect(members.result.current.data).toBeUndefined();
  });

  it("surfaces backend failures instead of returning sample calendar events", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("backend unavailable")));

    const events = renderHook(() => useEvents(), { wrapper: wrapper() });

    await waitFor(() => expect(events.result.current.isError).toBe(true));
    expect(events.result.current.data).toBeUndefined();
  });

  it("does not request a household endpoint for an invalid household ID", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const household = renderHook(() => useHousehold("smith"), { wrapper: wrapper() });

    expect(household.result.current.fetchStatus).toBe("idle");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

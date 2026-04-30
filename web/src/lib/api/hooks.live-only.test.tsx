import { describe, expect, it, vi, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import {
  useLiveEvents,
  useLiveLists,
  useLiveMealPlan,
  useLiveMembers,
  useLiveRecipes,
  useLiveRoutines,
} from "./hooks";

function wrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

describe("live-only API hooks", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("surfaces errors instead of sample household data when production reads fail", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("backend unavailable")));

    const members = renderHook(() => useLiveMembers(), { wrapper: wrapper() });
    const events = renderHook(() => useLiveEvents(), { wrapper: wrapper() });
    const routines = renderHook(() => useLiveRoutines(), { wrapper: wrapper() });
    const lists = renderHook(() => useLiveLists(), { wrapper: wrapper() });
    const recipes = renderHook(() => useLiveRecipes(), { wrapper: wrapper() });
    const mealPlan = renderHook(() => useLiveMealPlan("2026-01-05"), { wrapper: wrapper() });

    await waitFor(() => expect(members.result.current.isError).toBe(true));
    await waitFor(() => expect(events.result.current.isError).toBe(true));
    await waitFor(() => expect(routines.result.current.isError).toBe(true));
    await waitFor(() => expect(lists.result.current.isError).toBe(true));
    await waitFor(() => expect(recipes.result.current.isError).toBe(true));
    await waitFor(() => expect(mealPlan.result.current.isError).toBe(true));

    expect(members.result.current.data).toBeUndefined();
    expect(events.result.current.data).toBeUndefined();
    expect(routines.result.current.data).toBeUndefined();
    expect(lists.result.current.data).toBeUndefined();
    expect(recipes.result.current.data).toBeUndefined();
    expect(mealPlan.result.current.data).toBeUndefined();
  });
});

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

  it("returns empty values instead of sample household data when production reads fail", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("backend unavailable")));

    const members = renderHook(() => useLiveMembers(), { wrapper: wrapper() });
    const events = renderHook(() => useLiveEvents(), { wrapper: wrapper() });
    const routines = renderHook(() => useLiveRoutines(), { wrapper: wrapper() });
    const lists = renderHook(() => useLiveLists(), { wrapper: wrapper() });
    const recipes = renderHook(() => useLiveRecipes(), { wrapper: wrapper() });
    const mealPlan = renderHook(() => useLiveMealPlan("2026-01-05"), { wrapper: wrapper() });

    await waitFor(() => expect(members.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(events.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(routines.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(lists.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(recipes.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(mealPlan.result.current.isSuccess).toBe(true));

    expect(members.result.current.data).toEqual([]);
    expect(events.result.current.data).toEqual([]);
    expect(routines.result.current.data).toEqual([]);
    expect(lists.result.current.data).toEqual([]);
    expect(recipes.result.current.data).toEqual([]);
    expect(mealPlan.result.current.data?.grid.flat().every((recipeId) => recipeId === null)).toBe(true);
  });
});

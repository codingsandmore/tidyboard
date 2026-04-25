/**
 * React Query hooks for every Tidyboard backend endpoint.
 *
 * While the backend is being built, each hook falls back to sample data from
 * data.ts (via fallback.ts) when:
 *   - NEXT_PUBLIC_API_URL is "" (fallback mode), OR
 *   - the API call fails (network error / backend down).
 *
 * Screens continue to import { TBD } from "@/lib/data" for now.
 * Migration guide: see src/lib/api/README.md.
 */
"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";
import { fallback, isApiFallbackMode } from "./fallback";
import type {
  TBDEvent,
  Member,
  Recipe,
  FamilyList,
  Shopping,
  Routine,
  Equity,
  ListItem,
  ShoppingItem,
  MealPlan,
  Race,
  ListAuditResponse,
} from "./types";

// ── Query key factory ──────────────────────────────────────────────────────

export const qk = {
  events: (range?: { start: string; end: string }) =>
    ["events", range] as const,
  members: () => ["members"] as const,
  recipes: () => ["recipes"] as const,
  recipe: (id: string) => ["recipes", id] as const,
  lists: () => ["lists"] as const,
  list: (id: string) => ["lists", id] as const,
  shopping: () => ["shopping"] as const,
  routines: () => ["routines"] as const,
  equity: (period?: string) => ["equity", period] as const,
  mealPlan: (weekOf?: string) => ["mealPlan", weekOf ?? "current"] as const,
  race: () => ["race"] as const,
  audit: (
    limit: number,
    offset: number,
    filters?: { action?: string; target_type?: string; from?: string; to?: string }
  ) => ["audit", limit, offset, filters] as const,
};

// ── Helpers ────────────────────────────────────────────────────────────────

/** Wraps an API call and returns fallback data on any error. */
async function withFallback<T>(
  apiFn: () => Promise<T>,
  fallbackFn: () => T
): Promise<T> {
  if (isApiFallbackMode()) return fallbackFn();
  try {
    return await apiFn();
  } catch {
    return fallbackFn();
  }
}

// ── Read hooks ─────────────────────────────────────────────────────────────

export function useEvents(range?: { start: string; end: string }) {
  return useQuery<TBDEvent[]>({
    queryKey: qk.events(range),
    queryFn: () =>
      withFallback(
        () => {
          const params = range
            ? `?start=${encodeURIComponent(range.start)}&end=${encodeURIComponent(range.end)}`
            : "";
          return api.get<TBDEvent[]>(`/v1/events${params}`);
        },
        () => fallback.events()
      ),
  });
}

export function useMembers() {
  return useQuery<Member[]>({
    queryKey: qk.members(),
    queryFn: () =>
      withFallback(
        () => api.get<Member[]>("/v1/households/current/members"),
        () => fallback.members()
      ),
  });
}

export function useRecipes() {
  return useQuery<Recipe[]>({
    queryKey: qk.recipes(),
    queryFn: () =>
      withFallback(
        () => api.get<Recipe[]>("/v1/recipes"),
        () => fallback.recipes()
      ),
  });
}

export function useRecipe(id: string) {
  return useQuery<Recipe | undefined>({
    queryKey: qk.recipe(id),
    queryFn: () =>
      withFallback(
        () => api.get<Recipe>(`/v1/recipes/${id}`),
        () => fallback.recipe(id)
      ),
    enabled: Boolean(id),
  });
}

export function useLists() {
  return useQuery<FamilyList[]>({
    queryKey: qk.lists(),
    queryFn: () =>
      withFallback(
        () => api.get<FamilyList[]>("/v1/lists"),
        () => fallback.lists()
      ),
  });
}

export function useList(id: string) {
  return useQuery<FamilyList | undefined>({
    queryKey: qk.list(id),
    queryFn: () =>
      withFallback(
        () => api.get<FamilyList>(`/v1/lists/${id}`),
        () => fallback.list(id)
      ),
    enabled: Boolean(id),
  });
}

export function useShopping() {
  return useQuery<Shopping>({
    queryKey: qk.shopping(),
    queryFn: () =>
      withFallback(
        () => api.get<Shopping>("/v1/shopping/current"),
        () => fallback.shopping()
      ),
  });
}

export function useRoutines() {
  return useQuery<Routine[]>({
    queryKey: qk.routines(),
    queryFn: () =>
      withFallback(
        () => api.get<Routine[]>("/v1/routines"),
        () => fallback.routines()
      ),
  });
}

export function useEquity(period?: string) {
  return useQuery<Equity>({
    queryKey: qk.equity(period),
    queryFn: () =>
      withFallback(
        () => {
          const params = period
            ? `?period=${encodeURIComponent(period)}`
            : "";
          return api.get<Equity>(`/v1/equity${params}`);
        },
        () => fallback.equity()
      ),
  });
}

// ── Mutation hooks ─────────────────────────────────────────────────────────

export function useToggleListItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ listId, itemId, completed }: { listId: string; itemId: string; completed: boolean }) =>
      api.patch<ListItem>(`/v1/lists/${listId}/items/${itemId}`, { completed }),
    onSuccess: (_data, { listId }) => {
      qc.invalidateQueries({ queryKey: qk.list(listId) });
      qc.invalidateQueries({ queryKey: qk.lists() });
    },
  });
}

export function useCreateList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ name, type = "todo" }: { name: string; type?: string }) =>
      api.post<FamilyList>("/v1/lists", { name, type }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.lists() });
    },
  });
}

export function useAddListItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ listId, text }: { listId: string; text: string }) =>
      api.post<ListItem>(`/v1/lists/${listId}/items`, { text }),
    onSuccess: (_data, { listId }) => {
      qc.invalidateQueries({ queryKey: qk.list(listId) });
      qc.invalidateQueries({ queryKey: qk.lists() });
    },
  });
}

export function useDeleteListItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ listId, itemId }: { listId: string; itemId: string }) =>
      api.delete<void>(`/v1/lists/${listId}/items/${itemId}`),
    onSuccess: (_data, { listId }) => {
      qc.invalidateQueries({ queryKey: qk.list(listId) });
      qc.invalidateQueries({ queryKey: qk.lists() });
    },
  });
}

export function useCreateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: { title: string; start_time: string; end_time: string; location?: string; description?: string; all_day?: boolean }) =>
      api.post<TBDEvent>("/v1/events", req),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["events"] });
    },
  });
}

export function useUpdateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...req }: { id: string; title?: string; start_time?: string; end_time?: string; location?: string; description?: string }) =>
      api.patch<TBDEvent>(`/v1/events/${id}`, req),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["events"] });
    },
  });
}

export function useToggleRoutineStep() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ routineId, stepId, done }: { routineId: string; stepId: string; done: boolean }) =>
      api.put<unknown>(`/v1/routines/${routineId}/steps/${stepId}`, { done }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.routines() });
    },
  });
}

export function useToggleShoppingItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ category, name, done }: { category: string; name: string; done: boolean }) =>
      api.put<ShoppingItem>(`/v1/shopping/current/items`, { category, name, done }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.shopping() });
    },
  });
}

export function useSetEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (event: Partial<TBDEvent> & { id?: string }) =>
      event.id
        ? api.put<TBDEvent>(`/v1/events/${event.id}`, event)
        : api.post<TBDEvent>("/v1/events", event),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["events"] });
    },
  });
}

export function useDeleteEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/v1/events/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["events"] });
    },
  });
}

export function useMealPlan(weekOf?: string) {
  return useQuery<MealPlan>({
    queryKey: qk.mealPlan(weekOf),
    queryFn: () =>
      withFallback(
        () => api.get<MealPlan>(`/v1/meals?weekOf=${weekOf ?? ""}`),
        () => fallback.mealPlan()
      ),
  });
}

export function useRace() {
  return useQuery<Race>({
    queryKey: qk.race(),
    queryFn: () =>
      withFallback(
        () => api.get<Race>("/v1/races/current"),
        () => fallback.race()
      ),
  });
}

export function useImportRecipe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (url: string) => api.post<Recipe>("/v1/recipes/import", { url }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.recipes() });
    },
  });
}

// ── Calendar hooks ─────────────────────────────────────────────────────────

export interface Calendar {
  id: string;
  household_id: string;
  name: string;
  kind: string;
  url: string;
  created_at: string;
}

export function useCalendars() {
  return useQuery<Calendar[]>({
    queryKey: ["calendars"],
    queryFn: () =>
      withFallback(
        () => api.get<Calendar[]>("/v1/calendars"),
        () => []
      ),
  });
}

export function useAddICalCalendar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ name, url }: { name: string; url: string }) =>
      api.post<Calendar>("/v1/calendars/ical", { name, url }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["calendars"] });
    },
  });
}

export function useSyncICal(calendarId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ rangeStart, rangeEnd }: { rangeStart: string; rangeEnd: string }) =>
      api.post<{ synced_count: number }>(`/v1/calendars/${calendarId}/sync-ical`, {
        range_start: rangeStart,
        range_end: rangeEnd,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["events"] });
    },
  });
}

export function useAudit(
  limit = 50,
  offset = 0,
  filters?: { action?: string; target_type?: string; from?: string; to?: string }
) {
  return useQuery<ListAuditResponse>({
    queryKey: qk.audit(limit, offset, filters),
    queryFn: () =>
      withFallback(
        () => {
          const params = new URLSearchParams();
          params.set("limit", String(limit));
          params.set("offset", String(offset));
          if (filters?.action) params.set("action", filters.action);
          if (filters?.target_type) params.set("target_type", filters.target_type);
          if (filters?.from) params.set("from", filters.from);
          if (filters?.to) params.set("to", filters.to);
          return api.get<ListAuditResponse>(`/v1/audit?${params.toString()}`);
        },
        () => fallback.audit(limit, offset, filters)
      ),
  });
}

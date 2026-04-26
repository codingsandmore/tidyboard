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
  ApiEquityDashboard,
  ApiEquityTask,
  ApiTaskDomain,
  ApiTaskLog,
  ApiRebalanceSuggestion,
  CreateEquityTaskRequest,
  UpdateEquityTaskRequest,
  LogTaskTimeRequest,
  RecipeCollection,
  CreateCollectionRequest,
  UpdateCollectionRequest,
  ApiRoutine,
  ApiRoutineStep,
  ApiCompletion,
  ApiStreakResponse,
  CreateRoutineRequest,
  UpdateRoutineRequest,
  AddStepRequest,
  UpdateStepRequest,
  MarkCompleteRequest,
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
  routines: (params?: { member_id?: string; time_slot?: string }) =>
    ["routines", params] as const,
  routine: (id: string) => ["routines", id] as const,
  routineStreak: (routineId: string, memberId: string) =>
    ["routines", routineId, "streak", memberId] as const,
  routineCompletions: (date?: string, memberId?: string) =>
    ["routines", "completions", date, memberId] as const,
  equity: (period?: string) => ["equity", period] as const,
  equityDashboard: (from?: string, to?: string) => ["equity", "dashboard", from, to] as const,
  equityTasks: () => ["equity", "tasks"] as const,
  equityDomains: () => ["equity", "domains"] as const,
  equitySuggestions: () => ["equity", "suggestions"] as const,
  mealPlan: (weekOf?: string) => ["mealPlan", weekOf ?? "current"] as const,
  race: () => ["race"] as const,
  audit: (
    limit: number,
    offset: number,
    filters?: { action?: string; target_type?: string; from?: string; to?: string }
  ) => ["audit", limit, offset, filters] as const,
  collections: () => ["collections"] as const,
  collectionRecipes: (id: string) => ["collections", id, "recipes"] as const,
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

export function useRoutines(params?: { member_id?: string; time_slot?: string }) {
  return useQuery<ApiRoutine[]>({
    queryKey: qk.routines(params),
    queryFn: () =>
      withFallback(
        () => {
          const qs = new URLSearchParams();
          if (params?.member_id) qs.set("member_id", params.member_id);
          if (params?.time_slot) qs.set("time_slot", params.time_slot);
          const suffix = qs.toString() ? `?${qs.toString()}` : "";
          return api.get<ApiRoutine[]>(`/v1/routines${suffix}`);
        },
        () => fallback.routines() as unknown as ApiRoutine[]
      ),
  });
}

export function useCreateRoutine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: CreateRoutineRequest) =>
      api.post<ApiRoutine>("/v1/routines", req),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["routines"] });
    },
  });
}

export function useUpdateRoutine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...req }: { id: string } & UpdateRoutineRequest) =>
      api.patch<ApiRoutine>(`/v1/routines/${id}`, req),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["routines"] });
    },
  });
}

export function useDeleteRoutine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/v1/routines/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["routines"] });
    },
  });
}

export function useAddStep() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ routineId, ...req }: { routineId: string } & AddStepRequest) =>
      api.post<ApiRoutineStep>(`/v1/routines/${routineId}/steps`, req),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["routines"] });
    },
  });
}

export function useUpdateStep() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      routineId,
      stepId,
      ...req
    }: { routineId: string; stepId: string } & UpdateStepRequest) =>
      api.patch<ApiRoutineStep>(`/v1/routines/${routineId}/steps/${stepId}`, req),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["routines"] });
    },
  });
}

export function useDeleteStep() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ routineId, stepId }: { routineId: string; stepId: string }) =>
      api.delete<void>(`/v1/routines/${routineId}/steps/${stepId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["routines"] });
    },
  });
}

export function useMarkStepComplete() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ routineId, req }: { routineId: string; req: MarkCompleteRequest }) =>
      api.post<ApiCompletion>(`/v1/routines/${routineId}/complete`, req),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["routines"] });
    },
  });
}

export function useUnmarkStep() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      routineId,
      completionId,
    }: {
      routineId: string;
      completionId: string;
    }) => api.delete<void>(`/v1/routines/${routineId}/complete/${completionId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["routines"] });
    },
  });
}

export function useStreak(routineId: string, memberId: string) {
  return useQuery<ApiStreakResponse>({
    queryKey: qk.routineStreak(routineId, memberId),
    queryFn: () =>
      api.get<ApiStreakResponse>(
        `/v1/routines/${routineId}/streak?member_id=${encodeURIComponent(memberId)}`
      ),
    enabled: Boolean(routineId) && Boolean(memberId),
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

// ── Equity engine hooks ────────────────────────────────────────────────────

/** Returns the live equity dashboard from the backend. */
export function useEquityDashboard(from?: string, to?: string) {
  return useQuery<ApiEquityDashboard>({
    queryKey: qk.equityDashboard(from, to),
    queryFn: () => {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const qs = params.toString() ? `?${params.toString()}` : "";
      return api.get<ApiEquityDashboard>(`/v1/equity${qs}`);
    },
  });
}

/** Returns canonical task domains for the household (seeds defaults on first call). */
export function useEquityDomains() {
  return useQuery<ApiTaskDomain[]>({
    queryKey: qk.equityDomains(),
    queryFn: () => api.get<ApiTaskDomain[]>("/v1/equity/domains"),
  });
}

/** Returns all non-archived equity tasks. */
export function useEquityTasks() {
  return useQuery<ApiEquityTask[]>({
    queryKey: qk.equityTasks(),
    queryFn: () => api.get<ApiEquityTask[]>("/v1/equity/tasks"),
  });
}

/** Returns rebalance suggestions based on last 30 days of data. */
export function useRebalanceSuggestions() {
  return useQuery<ApiRebalanceSuggestion[]>({
    queryKey: qk.equitySuggestions(),
    queryFn: () => api.get<ApiRebalanceSuggestion[]>("/v1/equity/suggestions"),
  });
}

export function useCreateEquityTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: CreateEquityTaskRequest) =>
      api.post<ApiEquityTask>("/v1/equity/tasks", req),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.equityTasks() });
      qc.invalidateQueries({ queryKey: ["equity"] });
    },
  });
}

export function useUpdateEquityTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...req }: UpdateEquityTaskRequest & { id: string }) =>
      api.patch<ApiEquityTask>(`/v1/equity/tasks/${id}`, req),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.equityTasks() });
      qc.invalidateQueries({ queryKey: ["equity"] });
    },
  });
}

export function useDeleteEquityTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/v1/equity/tasks/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.equityTasks() });
      qc.invalidateQueries({ queryKey: ["equity"] });
    },
  });
}

export function useLogTaskTime() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, ...req }: LogTaskTimeRequest & { taskId: string }) =>
      api.post<ApiTaskLog>(`/v1/equity/tasks/${taskId}/log`, req),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["equity"] });
    },
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

/** @deprecated use useMarkStepComplete / useUnmarkStep instead */
export function useToggleRoutineStep() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ routineId, stepId, memberId, done }: { routineId: string; stepId: string; memberId: string; done: boolean }) => {
      if (done) {
        return api.post<ApiCompletion>(`/v1/routines/${routineId}/complete`, {
          step_id: stepId,
          member_id: memberId,
        });
      }
      // unmark: no completionId available in legacy callers — best effort no-op
      return Promise.resolve(null);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["routines"] });
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

// Backend flat entry shape returned by GET /v1/meal-plan
interface MealPlanEntry {
  id: string;
  household_id: string;
  recipe_id?: string | null;
  date: string; // YYYY-MM-DD
  slot: string; // breakfast | lunch | dinner | snack
  created_at: string;
  updated_at: string;
}

const MEAL_PLAN_ROWS = ["Breakfast", "Lunch", "Dinner", "Snack"] as const;
const SLOT_TO_ROW_IDX: Record<string, number> = {
  breakfast: 0,
  lunch: 1,
  dinner: 2,
  snack: 3,
};

/** Returns the Monday of the ISO week containing `date` (YYYY-MM-DD). */
function weekMonday(date: Date): string {
  const d = new Date(date);
  const day = d.getUTCDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

/** Convert a flat MealPlanEntry[] to the MealPlan grid shape the UI expects. */
function entriesToMealPlan(entries: MealPlanEntry[], from: string): MealPlan {
  const weekOf = weekMonday(new Date(from));
  // Build day index: date string → column index 0–6
  const dayIndex: Record<string, number> = {};
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekOf);
    d.setUTCDate(d.getUTCDate() + i);
    dayIndex[d.toISOString().slice(0, 10)] = i;
  }
  // Empty grid: 4 rows × 7 cols
  const grid: (string | null)[][] = Array.from({ length: 4 }, () =>
    Array(7).fill(null)
  );
  for (const e of entries) {
    const rowIdx = SLOT_TO_ROW_IDX[e.slot];
    const colIdx = dayIndex[e.date];
    if (rowIdx !== undefined && colIdx !== undefined && e.recipe_id) {
      grid[rowIdx][colIdx] = e.recipe_id;
    }
  }
  return { weekOf, rows: [...MEAL_PLAN_ROWS], grid };
}

export function useMealPlan(weekOf?: string) {
  // Derive from/to: default to current ISO week Mon–Sun
  const from = weekOf ?? weekMonday(new Date());
  const toDate = new Date(from);
  toDate.setUTCDate(toDate.getUTCDate() + 6);
  const to = toDate.toISOString().slice(0, 10);

  return useQuery<MealPlan>({
    queryKey: qk.mealPlan(from),
    queryFn: () =>
      withFallback(
        async () => {
          const entries = await api.get<MealPlanEntry[]>(
            `/v1/meal-plan?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
          );
          return entriesToMealPlan(entries, from);
        },
        () => fallback.mealPlan()
      ),
  });
}

export function useUpsertMealPlanEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      date,
      slot,
      recipeId,
    }: {
      date: string;
      slot: string;
      recipeId?: string | null;
    }) =>
      api.post<MealPlanEntry>("/v1/meal-plan", {
        date,
        slot,
        ...(recipeId ? { recipe_id: recipeId } : {}),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mealPlan"] });
    },
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

// ── Shopping mutation hooks ────────────────────────────────────────────────

export interface GeneratedShoppingListItem {
  id: string;
  shopping_list_id: string;
  name: string;
  amount: number;
  unit: string;
  aisle: string;
  source_recipes: string[];
  completed: boolean;
  sort_order: number;
}

export interface GeneratedShoppingList {
  id: string;
  household_id: string;
  name: string;
  date_from: string;
  date_to: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  items: GeneratedShoppingListItem[];
}

export function useGenerateShoppingList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ dateFrom, dateTo }: { dateFrom: string; dateTo: string }) =>
      api.post<GeneratedShoppingList>("/v1/shopping/generate", {
        date_from: dateFrom,
        date_to: dateTo,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.shopping() });
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

// ── Members mutation hooks ─────────────────────────────────────────────────

export function useCreateMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      householdId,
      name,
      displayName,
      color,
      role,
      ageGroup,
      pin,
    }: {
      householdId: string;
      name: string;
      displayName: string;
      color: string;
      role: string;
      ageGroup: string;
      pin?: string;
    }) =>
      api.post<Member>(`/v1/households/${householdId}/members`, {
        name,
        display_name: displayName,
        color,
        role,
        age_group: ageGroup,
        ...(pin ? { pin } : {}),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.members() });
    },
  });
}

export function useUpdateMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      householdId,
      memberId,
      name,
      displayName,
      color,
      role,
      ageGroup,
      pin,
    }: {
      householdId: string;
      memberId: string;
      name?: string;
      displayName?: string;
      color?: string;
      role?: string;
      ageGroup?: string;
      pin?: string;
    }) =>
      api.patch<Member>(`/v1/households/${householdId}/members/${memberId}`, {
        ...(name !== undefined ? { name } : {}),
        ...(displayName !== undefined ? { display_name: displayName } : {}),
        ...(color !== undefined ? { color } : {}),
        ...(role !== undefined ? { role } : {}),
        ...(ageGroup !== undefined ? { age_group: ageGroup } : {}),
        ...(pin !== undefined ? { pin } : {}),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.members() });
    },
  });
}

// ── Household settings hooks ───────────────────────────────────────────────

export interface HouseholdSettings {
  kiosk_mode_enabled?: boolean;
  [key: string]: unknown;
}

export interface HouseholdResponse {
  id: string;
  name: string;
  timezone: string;
  settings: HouseholdSettings;
  invite_code: string;
  created_at: string;
  updated_at: string;
}

export function useHousehold(householdId: string | undefined) {
  return useQuery<HouseholdResponse>({
    queryKey: ["household", householdId],
    queryFn: () => api.get<HouseholdResponse>(`/v1/households/${householdId}`),
    enabled: Boolean(householdId),
  });
}

export function useUpdateHouseholdSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      householdId,
      settings,
    }: {
      householdId: string;
      settings: HouseholdSettings;
    }) =>
      api.patch<HouseholdResponse>(`/v1/households/${householdId}`, { settings }),
    onSuccess: (_data, { householdId }) => {
      qc.invalidateQueries({ queryKey: ["household", householdId] });
    },
  });
}

// ── Notification hooks ─────────────────────────────────────────────────────

export interface NotifyPreferences {
  events_enabled: boolean;
  lists_enabled: boolean;
  tasks_enabled: boolean;
}

export function useUpdateMemberNotify(memberId: string) {
  return useMutation({
    mutationFn: ({
      ntfyTopic,
      preferences,
    }: {
      ntfyTopic?: string;
      preferences: NotifyPreferences;
    }) =>
      api.patch<{ status: string }>(`/v1/members/${memberId}/notify`, {
        ntfy_topic: ntfyTopic ?? null,
        events_enabled: preferences.events_enabled,
        lists_enabled: preferences.lists_enabled,
        tasks_enabled: preferences.tasks_enabled,
      }),
  });
}

export function useTestNotification(memberId: string) {
  return useMutation({
    mutationFn: () =>
      api.post<{ status: string }>("/v1/notify/test", { member_id: memberId }),
  });
}

export function useDeleteMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      householdId,
      memberId,
    }: {
      householdId: string;
      memberId: string;
    }) =>
      api.delete<void>(
        `/v1/households/${householdId}/members/${memberId}`
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.members() });
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

// ── Recipe Collection hooks ────────────────────────────────────────────────

export function useRecipeCollections() {
  return useQuery<RecipeCollection[]>({
    queryKey: qk.collections(),
    queryFn: () =>
      withFallback(
        () => api.get<RecipeCollection[]>("/v1/recipe-collections"),
        () => []
      ),
  });
}

export function useCollectionRecipes(collectionId: string) {
  return useQuery<Recipe[]>({
    queryKey: qk.collectionRecipes(collectionId),
    queryFn: () =>
      withFallback(
        () => api.get<Recipe[]>(`/v1/recipe-collections/${collectionId}/recipes`),
        () => []
      ),
    enabled: Boolean(collectionId),
  });
}

export function useCreateCollection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: CreateCollectionRequest) =>
      api.post<RecipeCollection>("/v1/recipe-collections", req),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.collections() });
    },
  });
}

export function useUpdateCollection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...req }: UpdateCollectionRequest & { id: string }) =>
      api.patch<RecipeCollection>(`/v1/recipe-collections/${id}`, req),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.collections() });
    },
  });
}

export function useDeleteCollection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/v1/recipe-collections/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.collections() });
    },
  });
}

export function useAssignRecipeToCollection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      collectionId,
      recipeId,
      sortOrder = 0,
    }: {
      collectionId: string;
      recipeId: string;
      sortOrder?: number;
    }) =>
      api.post<void>(`/v1/recipe-collections/${collectionId}/recipes`, {
        recipe_id: recipeId,
        sort_order: sortOrder,
      }),
    onSuccess: (_data, { collectionId }) => {
      qc.invalidateQueries({ queryKey: qk.collectionRecipes(collectionId) });
      qc.invalidateQueries({ queryKey: qk.collections() });
    },
  });
}

export function useRemoveRecipeFromCollection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      collectionId,
      recipeId,
    }: {
      collectionId: string;
      recipeId: string;
    }) =>
      api.delete<void>(`/v1/recipe-collections/${collectionId}/recipes/${recipeId}`),
    onSuccess: (_data, { collectionId }) => {
      qc.invalidateQueries({ queryKey: qk.collectionRecipes(collectionId) });
      qc.invalidateQueries({ queryKey: qk.collections() });
    },
  });
}

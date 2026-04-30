/**
 * React Query hooks for every Tidyboard backend endpoint.
 *
 * API failures surface as errors. Production routes must never silently
 * substitute sample household data.
 */
"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";
import { fallback } from "./fallback";
import { isUuid } from "@/lib/id";
import { apiShoppingListItemToShoppingItem, apiShoppingListToShopping, type ApiShoppingList, type ApiShoppingListItem } from "./shopping";
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
  JoinRequest,
  HouseholdPreview,
  ApiChore,
  ApiChoreCompletion,
  ApiWalletGetResponse,
  ApiAllowance,
  ApiAdHocTask,
  ApiPointCategory,
  ApiBehavior,
  ApiPointGrant,
  ApiPointsBalance,
  ApiScoreboardEntry,
  ApiReward,
  ApiRedemption,
  ApiRedeemResponse,
  ApiSavingsGoal,
  ApiRewardCostAdjustment,
  ApiTimelineEvent,
} from "./types";

// ── Query key factory ──────────────────────────────────────────────────────

export const qk = {
  events: (opts?: { start?: string; end?: string; memberId?: string }) =>
    ["events", opts] as const,
  event: (id: string) => ["events", id] as const,
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
  householdByCode: (code: string) => ["householdByCode", code] as const,
  joinRequests: (householdId: string) => ["joinRequests", householdId] as const,
};

// ── Helpers ────────────────────────────────────────────────────────────────

/** Returns true when `err` is an ApiError plain object (duck-type check). */
/** Compatibility wrapper; API failures intentionally propagate to callers. */
async function withFallback<T>(
  apiFn: () => Promise<T>,
  fallbackFn: () => T
): Promise<T> {
  void fallbackFn;
  return apiFn();
}

/** Compatibility wrapper; API failures intentionally propagate to callers. */
async function withoutSampleFallback<T>(
  apiFn: () => Promise<T>,
  emptyValue: T
): Promise<T> {
  void emptyValue;
  return apiFn();
}

// ── Read hooks ─────────────────────────────────────────────────────────────

export function useEvents(opts?: { start?: string; end?: string; memberId?: string }) {
  return useQuery<TBDEvent[]>({
    queryKey: qk.events(opts),
    queryFn: () =>
      withFallback(
        () => {
          const qs = new URLSearchParams();
          if (opts?.start) qs.set("start", opts.start);
          if (opts?.end) qs.set("end", opts.end);
          if (opts?.memberId) qs.set("member_id", opts.memberId);
          const suffix = qs.toString() ? `?${qs.toString()}` : "";
          return api.get<TBDEvent[]>(`/v1/events${suffix}`);
        },
        () => fallback.events()
      ),
  });
}

export function useLiveEvents(opts?: { start?: string; end?: string; memberId?: string }) {
  return useQuery<TBDEvent[]>({
    queryKey: ["live-only", ...qk.events(opts)] as const,
    queryFn: () =>
      withoutSampleFallback(
        () => {
          const qs = new URLSearchParams();
          if (opts?.start) qs.set("start", opts.start);
          if (opts?.end) qs.set("end", opts.end);
          if (opts?.memberId) qs.set("member_id", opts.memberId);
          const suffix = qs.toString() ? `?${qs.toString()}` : "";
          return api.get<TBDEvent[]>(`/v1/events${suffix}`);
        },
        []
      ),
  });
}

export function useLiveEvent(id?: string) {
  return useQuery<TBDEvent | undefined>({
    queryKey: qk.event(id ?? ""),
    queryFn: () => {
      if (!id) return Promise.resolve(undefined);
      return withoutSampleFallback(
        () => api.get<TBDEvent>(`/v1/events/${id}`),
        undefined
      );
    },
    enabled: Boolean(id),
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

export function useLiveMembers() {
  return useQuery<Member[]>({
    queryKey: ["live-only", ...qk.members()] as const,
    queryFn: () =>
      withoutSampleFallback(
        () => api.get<Member[]>("/v1/households/current/members"),
        []
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

export function useLiveRecipes() {
  return useQuery<Recipe[]>({
    queryKey: ["live-only", ...qk.recipes()] as const,
    queryFn: () =>
      withoutSampleFallback(
        () => api.get<Recipe[]>("/v1/recipes"),
        []
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

export function useLiveLists() {
  return useQuery<FamilyList[]>({
    queryKey: ["live-only", ...qk.lists()] as const,
    queryFn: () =>
      withoutSampleFallback(
        () => api.get<FamilyList[]>("/v1/lists"),
        []
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
        async () => apiShoppingListToShopping(await api.get<ApiShoppingList>("/v1/shopping/current")),
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

export function useLiveRoutines(params?: { member_id?: string; time_slot?: string }) {
  return useQuery<ApiRoutine[]>({
    queryKey: ["live-only", ...qk.routines(params)] as const,
    queryFn: () =>
      withoutSampleFallback(
        () => {
          const qs = new URLSearchParams();
          if (params?.member_id) qs.set("member_id", params.member_id);
          if (params?.time_slot) qs.set("time_slot", params.time_slot);
          const suffix = qs.toString() ? `?${qs.toString()}` : "";
          return api.get<ApiRoutine[]>(`/v1/routines${suffix}`);
        },
        []
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
    mutationFn: (req: { title: string; start_time: string; end_time: string; location?: string; description?: string; all_day?: boolean; recurrence_rule?: string }) =>
      api.post<TBDEvent>("/v1/events", req),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["events"] });
    },
  });
}

export function useUpdateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...req }: { id: string; title?: string; start_time?: string; end_time?: string; location?: string; description?: string; recurrence_rule?: string }) =>
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
    mutationFn: async ({ id, name, done }: { id?: string; category: string; name: string; done: boolean }) => {
      if (!id) return { amt: "", name, done } satisfies ShoppingItem;
      const item = await api.patch<ApiShoppingListItem>(`/v1/shopping/current/items/${encodeURIComponent(id)}`, {
        completed: done,
      });
      return apiShoppingListItemToShoppingItem(item);
    },
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

function emptyMealPlan(from: string): MealPlan {
  return {
    weekOf: weekMonday(new Date(from)),
    rows: [...MEAL_PLAN_ROWS],
    grid: Array.from({ length: MEAL_PLAN_ROWS.length }, () =>
      Array(7).fill(null)
    ),
  };
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

export function useLiveMealPlan(weekOf?: string) {
  const from = weekOf ?? weekMonday(new Date());
  const toDate = new Date(from);
  toDate.setUTCDate(toDate.getUTCDate() + 6);
  const to = toDate.toISOString().slice(0, 10);

  return useQuery<MealPlan>({
    queryKey: ["live-only", ...qk.mealPlan(from)] as const,
    queryFn: () =>
      withoutSampleFallback(
        async () => {
          const entries = await api.get<MealPlanEntry[]>(
            `/v1/meal-plan?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
          );
          return entriesToMealPlan(entries, from);
        },
        emptyMealPlan(from)
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

export function useGenerateShoppingList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ dateFrom, dateTo }: { dateFrom: string; dateTo: string }) =>
      api.post<ApiShoppingList>("/v1/shopping/generate", {
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

export interface HouseholdSummary {
  id: string;
  name: string;
}

/** Returns all households the authenticated account is a member of. */
export function useMyHouseholds() {
  return useQuery<HouseholdSummary[]>({
    queryKey: ["me", "households"],
    queryFn: () =>
      withFallback(
        () => api.get<HouseholdSummary[]>("/v1/me/households"),
        () => []
      ),
  });
}

export function useHousehold(householdId: string | undefined) {
  return useQuery<HouseholdResponse>({
    queryKey: ["household", householdId],
    queryFn: () => api.get<HouseholdResponse>(`/v1/households/${householdId}`),
    enabled: isUuid(householdId),
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

// ── Invite / join-request hooks ────────────────────────────────────────────

export function useRegenerateInviteCode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (householdId: string) =>
      api.post<{ invite_code: string }>(`/v1/households/${householdId}/invite/regenerate`, {}),
    onSuccess: (_data, householdId) => {
      qc.invalidateQueries({ queryKey: ["household", householdId] });
    },
  });
}

export function useHouseholdByCode(code: string) {
  return useQuery<HouseholdPreview>({
    queryKey: qk.householdByCode(code),
    queryFn: () => api.get<HouseholdPreview>(`/v1/households/by-code/${encodeURIComponent(code)}`),
    enabled: code.length === 8,
    retry: false,
  });
}

export function useRequestJoin() {
  return useMutation({
    mutationFn: (code: string) =>
      api.post<JoinRequest>(`/v1/households/by-code/${encodeURIComponent(code)}/join`, {}),
  });
}

export function useJoinRequests(householdId: string | undefined) {
  return useQuery<JoinRequest[]>({
    queryKey: qk.joinRequests(householdId ?? ""),
    queryFn: () => api.get<JoinRequest[]>(`/v1/households/${householdId}/join-requests`),
    enabled: Boolean(householdId),
  });
}

export function useApproveJoinRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ requestId }: { requestId: string; householdId: string }) =>
      api.post<JoinRequest>(`/v1/join-requests/${requestId}/approve`, {}),
    onSuccess: (_data, { householdId }) => {
      qc.invalidateQueries({ queryKey: qk.joinRequests(householdId) });
      qc.invalidateQueries({ queryKey: qk.members() });
    },
  });
}

export function useRejectJoinRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ requestId }: { requestId: string; householdId: string }) =>
      api.post<JoinRequest>(`/v1/join-requests/${requestId}/reject`, {}),
    onSuccess: (_data, { householdId }) => {
      qc.invalidateQueries({ queryKey: qk.joinRequests(householdId) });
    },
  });
}

// ── Chores ─────────────────────────────────────────────────────────────────
export function useChores(opts?: { memberId?: string }) {
  return useQuery<ApiChore[]>({
    queryKey: ["chores", opts?.memberId ?? null],
    queryFn: () =>
      withFallback(
        () => api.get<ApiChore[]>("/v1/chores" + (opts?.memberId ? `?member_id=${opts.memberId}` : "")),
        () => fallback.chores(opts?.memberId)
      ),
  });
}

export function useChoreCompletions(opts: { from: string; to: string; memberId?: string }) {
  return useQuery<ApiChoreCompletion[]>({
    queryKey: ["chore-completions", opts.from, opts.to, opts.memberId ?? null],
    queryFn: () => {
      const qs = new URLSearchParams({ from: opts.from, to: opts.to });
      if (opts.memberId) qs.set("member_id", opts.memberId);
      return withFallback(
        () => api.get<ApiChoreCompletion[]>(`/v1/chores/completions?${qs}`),
        () => fallback.choreCompletions(opts)
      );
    },
  });
}

export function useMarkChoreComplete() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ choreId, date }: { choreId: string; date?: string }) =>
      api.post<ApiChoreCompletion>(`/v1/chores/${choreId}/complete${date ? `?date=${date}` : ""}`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chore-completions"] });
      qc.invalidateQueries({ queryKey: ["wallet"] });
    },
  });
}

export function useUndoChoreComplete() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ choreId, date }: { choreId: string; date: string }) =>
      api.delete(`/v1/chores/${choreId}/complete/${date}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chore-completions"] });
      qc.invalidateQueries({ queryKey: ["wallet"] });
    },
  });
}

export function useCreateChore() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: { member_id: string; name: string; weight: number; frequency_kind: string; days_of_week?: string[]; auto_approve: boolean }) =>
      api.post<ApiChore>("/v1/chores", req),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["chores"] }),
  });
}

export function useUpdateChore() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...patch }: { id: string; name?: string; weight?: number; frequency_kind?: string; days_of_week?: string[]; auto_approve?: boolean }) =>
      api.patch<ApiChore>(`/v1/chores/${id}`, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["chores"] }),
  });
}

export function useArchiveChore() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) => api.delete(`/v1/chores/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["chores"] }),
  });
}

// ── Wallet ─────────────────────────────────────────────────────────────────
export function useWallet(memberId: string | undefined) {
  return useQuery<ApiWalletGetResponse>({
    queryKey: ["wallet", memberId],
    queryFn: () =>
      withFallback(
        () => api.get<ApiWalletGetResponse>(`/v1/wallet/${memberId}`),
        () => fallback.wallet(memberId!)
      ),
    enabled: Boolean(memberId),
  });
}

export function useTip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ memberId, amountCents, reason }: { memberId: string; amountCents: number; reason: string }) =>
      api.post(`/v1/wallet/${memberId}/tip`, { amount_cents: amountCents, reason }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wallet"] }),
  });
}

export function useCashOut() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ memberId, amountCents, method, note }: { memberId: string; amountCents: number; method?: string; note?: string }) =>
      api.post(`/v1/wallet/${memberId}/cash-out`, { amount_cents: amountCents, method: method ?? "", note: note ?? "" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wallet"] }),
  });
}

export function useAllowance() {
  return useQuery<ApiAllowance[]>({
    queryKey: ["allowance"],
    queryFn: () => withFallback(() => api.get<ApiAllowance[]>("/v1/allowance"), () => []),
  });
}

export function useUpsertAllowance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ memberId, amountCents }: { memberId: string; amountCents: number }) =>
      api.put(`/v1/allowance/${memberId}`, { amount_cents: amountCents }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["allowance"] });
      qc.invalidateQueries({ queryKey: ["chores"] });
    },
  });
}

// ── Ad-hoc tasks ───────────────────────────────────────────────────────────
export function useAdHocTasks(opts?: { memberId?: string; status?: string }) {
  return useQuery<ApiAdHocTask[]>({
    queryKey: ["ad-hoc-tasks", opts?.memberId ?? null, opts?.status ?? null],
    queryFn: () => withFallback(
      () => {
        const qs = new URLSearchParams();
        if (opts?.memberId) qs.set("member_id", opts.memberId);
        if (opts?.status) qs.set("status", opts.status);
        return api.get<ApiAdHocTask[]>(`/v1/ad-hoc-tasks${qs.toString() ? "?" + qs : ""}`);
      },
      () => []
    ),
  });
}

export function useCreateAdHocTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: { member_id: string; name: string; payout_cents: number; expires_at?: string; requires_approval?: boolean }) =>
      api.post<ApiAdHocTask>("/v1/ad-hoc-tasks", req),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ad-hoc-tasks"] }),
  });
}

export function useApproveAdHocTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) => api.post(`/v1/ad-hoc-tasks/${id}/approve`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ad-hoc-tasks"] });
      qc.invalidateQueries({ queryKey: ["wallet"] });
    },
  });
}

export function useDeclineAdHocTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api.post(`/v1/ad-hoc-tasks/${id}/decline`, { reason }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ad-hoc-tasks"] }),
  });
}

export function useCompleteAdHocTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) => api.post(`/v1/ad-hoc-tasks/${id}/complete`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ad-hoc-tasks"] }),
  });
}

// ── Point categories ───────────────────────────────────────────────────────
export function usePointCategories(opts?: { includeArchived?: boolean }) {
  return useQuery<ApiPointCategory[]>({
    queryKey: ["point-categories", opts?.includeArchived ?? false],
    queryFn: () =>
      withFallback(
        () => api.get<ApiPointCategory[]>(`/v1/point-categories${opts?.includeArchived ? "?include_archived=true" : ""}`),
        () => fallback.pointCategories()
      ),
  });
}
export function useCreatePointCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: { name: string; color: string; sort_order?: number }) =>
      api.post<ApiPointCategory>("/v1/point-categories", req),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["point-categories"] }),
  });
}
export function useUpdatePointCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...patch }: { id: string; name?: string; color?: string; sort_order?: number }) =>
      api.patch<ApiPointCategory>(`/v1/point-categories/${id}`, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["point-categories"] }),
  });
}
export function useArchivePointCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) => api.delete(`/v1/point-categories/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["point-categories"] }),
  });
}

// ── Behaviors ───────────────────────────────────────────────────────────────
export function useBehaviors(opts?: { categoryId?: string; includeArchived?: boolean }) {
  return useQuery<ApiBehavior[]>({
    queryKey: ["behaviors", opts?.categoryId ?? null, opts?.includeArchived ?? false],
    queryFn: () => {
      const qs = new URLSearchParams();
      if (opts?.categoryId) qs.set("category_id", opts.categoryId);
      if (opts?.includeArchived) qs.set("include_archived", "true");
      return withFallback(
        () => api.get<ApiBehavior[]>(`/v1/behaviors${qs.toString() ? "?" + qs : ""}`),
        () => fallback.behaviors(opts?.categoryId)
      );
    },
  });
}
export function useCreateBehavior() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: { category_id: string; name: string; suggested_points: number }) =>
      api.post<ApiBehavior>("/v1/behaviors", req),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["behaviors"] }),
  });
}
export function useUpdateBehavior() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...patch }: { id: string; category_id?: string; name?: string; suggested_points?: number }) =>
      api.patch<ApiBehavior>(`/v1/behaviors/${id}`, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["behaviors"] }),
  });
}
export function useArchiveBehavior() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) => api.delete(`/v1/behaviors/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["behaviors"] }),
  });
}

// ── Points: balance / scoreboard / grant / adjust ─────────────────────────
export function usePointsBalance(memberId: string | undefined) {
  return useQuery<ApiPointsBalance>({
    queryKey: ["points-balance", memberId],
    queryFn: () => withFallback(
      () => api.get<ApiPointsBalance>(`/v1/points/${memberId}`),
      () => fallback.pointsBalance(memberId!)
    ),
    enabled: Boolean(memberId),
  });
}
export function useScoreboard() {
  return useQuery<ApiScoreboardEntry[]>({
    queryKey: ["scoreboard"],
    queryFn: () => withFallback(
      () => api.get<ApiScoreboardEntry[]>("/v1/points/scoreboard"),
      () => fallback.scoreboard()
    ),
    refetchInterval: 30_000,
  });
}
export function useGrantPoints() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ memberId, ...req }: { memberId: string; behavior_id?: string; category_id?: string; points: number; reason: string }) =>
      api.post<ApiPointGrant>(`/v1/points/${memberId}/grant`, req),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["points-balance"] });
      qc.invalidateQueries({ queryKey: ["scoreboard"] });
      qc.invalidateQueries({ queryKey: ["timeline"] });
    },
  });
}
export function useAdjustPoints() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ memberId, points, reason }: { memberId: string; points: number; reason: string }) =>
      api.post<ApiPointGrant>(`/v1/points/${memberId}/adjust`, { points, reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["points-balance"] });
      qc.invalidateQueries({ queryKey: ["scoreboard"] });
      qc.invalidateQueries({ queryKey: ["timeline"] });
    },
  });
}

// ── Rewards catalog ────────────────────────────────────────────────────────
export function useRewards(opts?: { onlyActive?: boolean }) {
  const onlyActive = opts?.onlyActive ?? true;
  return useQuery<ApiReward[]>({
    queryKey: ["rewards", onlyActive],
    queryFn: () => withFallback(
      () => api.get<ApiReward[]>(`/v1/rewards?active=${onlyActive}`),
      () => fallback.rewards()
    ),
  });
}
export function useCreateReward() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: { name: string; description?: string; image_url?: string | null; cost_points: number; fulfillment_kind: "self_serve" | "needs_approval" }) =>
      api.post<ApiReward>("/v1/rewards", req),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rewards"] }),
  });
}
export function useUpdateReward() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...patch }: { id: string; name?: string; description?: string; image_url?: string | null; cost_points?: number; fulfillment_kind?: "self_serve" | "needs_approval"; active?: boolean }) =>
      api.patch<ApiReward>(`/v1/rewards/${id}`, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rewards"] }),
  });
}
export function useArchiveReward() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) => api.delete(`/v1/rewards/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rewards"] }),
  });
}

// ── Redemptions ────────────────────────────────────────────────────────────
export function useRedeemReward() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ rewardId }: { rewardId: string }) => api.post<ApiRedeemResponse>(`/v1/rewards/${rewardId}/redeem`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["points-balance"] });
      qc.invalidateQueries({ queryKey: ["redemptions"] });
      qc.invalidateQueries({ queryKey: ["timeline"] });
    },
  });
}
export function useRedemptions(opts?: { memberId?: string; status?: string }) {
  return useQuery<ApiRedemption[]>({
    queryKey: ["redemptions", opts?.memberId ?? null, opts?.status ?? null],
    queryFn: () => {
      const qs = new URLSearchParams();
      if (opts?.memberId) qs.set("member_id", opts.memberId);
      if (opts?.status) qs.set("status", opts.status);
      return withFallback(
        () => api.get<ApiRedemption[]>(`/v1/redemptions${qs.toString() ? "?" + qs : ""}`),
        () => fallback.redemptions()
      );
    },
  });
}
export function useApproveRedemption() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) => api.post<ApiRedemption>(`/v1/redemptions/${id}/approve`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["redemptions"] });
      qc.invalidateQueries({ queryKey: ["points-balance"] });
      qc.invalidateQueries({ queryKey: ["timeline"] });
    },
  });
}
export function useDeclineRedemption() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api.post<ApiRedemption>(`/v1/redemptions/${id}/decline`, { reason }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["redemptions"] }),
  });
}
export function useFulfillRedemption() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) => api.post<ApiRedemption>(`/v1/redemptions/${id}/fulfill`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["redemptions"] }),
  });
}

// ── Savings goal ───────────────────────────────────────────────────────────
export function useSetSavingsGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ memberId, rewardId }: { memberId: string; rewardId: string | null }) =>
      api.put<ApiSavingsGoal | null>(`/v1/savings-goals/${memberId}`, { reward_id: rewardId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["points-balance"] }),
  });
}

// ── Reward cost adjustments ────────────────────────────────────────────────
export function useCostAdjustReward() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ rewardId, ...req }: { rewardId: string; member_id: string; delta_points: number; reason: string; expires_at?: string }) =>
      api.post<ApiRewardCostAdjustment>(`/v1/rewards/${rewardId}/cost-adjust`, req),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rewards"] });
      qc.invalidateQueries({ queryKey: ["timeline"] });
    },
  });
}
export function useDeleteRewardAdjustment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) => api.delete(`/v1/reward-adjustments/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rewards"] }),
  });
}

// ── Timeline ───────────────────────────────────────────────────────────────
export function useTimeline(memberId: string | undefined, opts?: { limit?: number; offset?: number }) {
  const limit = opts?.limit ?? 50;
  const offset = opts?.offset ?? 0;
  return useQuery<ApiTimelineEvent[]>({
    queryKey: ["timeline", memberId, limit, offset],
    queryFn: () => withFallback(
      () => api.get<ApiTimelineEvent[]>(`/v1/timeline/${memberId}?limit=${limit}&offset=${offset}`),
      () => fallback.timeline(memberId!)
    ),
    enabled: Boolean(memberId),
  });
}

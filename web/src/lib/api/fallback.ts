/**
 * Offline / dev-mode fallback data.
 *
 * When NEXT_PUBLIC_API_URL is empty ("") or when the backend is unreachable,
 * React Query hooks in hooks.ts catch the error and return data from this
 * module instead — which delegates to the sample Smith-family data in data.ts.
 *
 * This lets every screen keep rendering against realistic data while the real
 * backend is being built, without any network calls.
 *
 * How it activates:
 *   - Set NEXT_PUBLIC_API_URL="" in .env.local  →  hooks skip the API entirely
 *     and return fallback data directly (no fetch attempt, no error shown).
 *   - If NEXT_PUBLIC_API_URL is set but the server is down, the hook catches
 *     the ApiError and falls back here automatically.
 *
 * Migration path:
 *   Once the backend endpoint for a hook is stable, remove the fallback branch
 *   from that hook and let React Query surface errors normally.
 */

import { TBD } from "@/lib/data";
import type {
  Member,
  TBDEvent,
  Recipe,
  FamilyList,
  Shopping,
  Routine,
  Equity,
  MealPlan,
  Race,
  AuditEntry,
  ListAuditResponse,
  ApiChore,
  ApiChoreCompletion,
  ApiWalletGetResponse,
  ApiPointCategory,
  ApiBehavior,
  ApiPointsBalance,
  ApiScoreboardEntry,
  ApiReward,
  ApiRedemption,
  ApiTimelineEvent,
} from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

/** Returns true when the API is intentionally disabled (empty URL). */
export function isApiFallbackMode(): boolean {
  return API_URL === "";
}

// ── Mock audit entries ─────────────────────────────────────────────────────

const MOCK_AUDIT_ENTRIES: AuditEntry[] = [
  {
    id: "a1", account_id: "demo-account", household_id: "demo-household",
    action: "event.create", target_type: "event", target_id: "evt-001",
    diff: { title: [null, "Soccer practice"], start: [null, "2026-04-22T15:00:00Z"] },
    ip_address: "192.168.1.10", user_agent: "Mozilla/5.0 (Macintosh)",
    created_at: "2026-04-22T14:55:00Z",
  },
  {
    id: "a2", account_id: "demo-account", household_id: "demo-household",
    action: "event.update", target_type: "event", target_id: "evt-001",
    diff: { location: [null, "Lincoln Park Field 3"] },
    ip_address: "192.168.1.10", user_agent: "Mozilla/5.0 (Macintosh)",
    created_at: "2026-04-22T14:57:00Z",
  },
  {
    id: "a3", account_id: "demo-account", household_id: "demo-household",
    action: "list.create", target_type: "list", target_id: "lst-001",
    diff: { name: [null, "Grocery run"] },
    ip_address: "192.168.1.11", user_agent: "Mozilla/5.0 (iPhone)",
    created_at: "2026-04-22T13:30:00Z",
  },
  {
    id: "a4", account_id: "demo-account", household_id: "demo-household",
    action: "list.update", target_type: "list", target_id: "lst-001",
    diff: { items: ["added", "Milk", "Eggs", "Bread"] },
    ip_address: "192.168.1.11", user_agent: "Mozilla/5.0 (iPhone)",
    created_at: "2026-04-22T13:32:00Z",
  },
  {
    id: "a5", account_id: "demo-account", household_id: "demo-household",
    action: "member.create", target_type: "member", target_id: "mbr-003",
    diff: { name: [null, "Emma"], role: [null, "child"] },
    ip_address: "192.168.1.10", user_agent: "Mozilla/5.0 (Macintosh)",
    created_at: "2026-04-21T18:00:00Z",
  },
  {
    id: "a6", account_id: "demo-account", household_id: "demo-household",
    action: "recipe.create", target_type: "recipe", target_id: "rec-007",
    diff: { title: [null, "Spaghetti Carbonara"], servings: [null, 4] },
    ip_address: "192.168.1.10", user_agent: "Mozilla/5.0 (Macintosh)",
    created_at: "2026-04-21T17:00:00Z",
  },
  {
    id: "a7", account_id: "demo-account", household_id: "demo-household",
    action: "recipe.update", target_type: "recipe", target_id: "rec-007",
    diff: { servings: [4, 6] },
    ip_address: "192.168.1.10", user_agent: "Mozilla/5.0 (Macintosh)",
    created_at: "2026-04-21T17:05:00Z",
  },
  {
    id: "a8", account_id: "demo-account", household_id: "demo-household",
    action: "household.update", target_type: "household", target_id: "demo-household",
    diff: { name: ["Smith Family", "The Smith Family"] },
    ip_address: "10.0.0.1", user_agent: "Mozilla/5.0 (Windows NT 10.0)",
    created_at: "2026-04-20T09:00:00Z",
  },
  {
    id: "a9", account_id: "demo-account", household_id: "demo-household",
    action: "backup.create", target_type: "backup", target_id: "bkp-2026-04-20",
    diff: { size_bytes: [null, 204800] },
    ip_address: "192.168.1.1", user_agent: "TidyboardBackup/1.0",
    created_at: "2026-04-20T03:00:00Z",
  },
  {
    id: "a10", account_id: "demo-account", household_id: "demo-household",
    action: "subscription.update", target_type: "subscription", target_id: "sub-001",
    diff: { status: ["trialing", "active"] },
    ip_address: "35.188.100.5", user_agent: "Stripe-Webhook/1.0",
    created_at: "2026-04-19T12:00:00Z",
  },
  {
    id: "a11", account_id: "demo-account", household_id: "demo-household",
    action: "event.delete", target_type: "event", target_id: "evt-000",
    diff: { title: ["Old dentist appt", null] },
    ip_address: "192.168.1.10", user_agent: "Mozilla/5.0 (Macintosh)",
    created_at: "2026-04-19T10:00:00Z",
  },
  {
    id: "a12", account_id: "demo-account", household_id: "demo-household",
    action: "member.update", target_type: "member", target_id: "mbr-003",
    diff: { pin: ["****", "****"] },
    ip_address: "192.168.1.11", user_agent: "Mozilla/5.0 (iPhone)",
    created_at: "2026-04-18T20:00:00Z",
  },
  {
    id: "a13", account_id: "demo-account", household_id: "demo-household",
    action: "list.delete", target_type: "list", target_id: "lst-000",
    diff: { name: ["Old chore list", null] },
    ip_address: "192.168.1.10", user_agent: "Mozilla/5.0 (Macintosh)",
    created_at: "2026-04-18T15:00:00Z",
  },
  {
    id: "a14", account_id: "demo-account", household_id: "demo-household",
    action: "event.create", target_type: "event", target_id: "evt-002",
    diff: { title: [null, "Piano lesson"], recurrence: [null, "weekly"] },
    ip_address: "192.168.1.10", user_agent: "Mozilla/5.0 (Macintosh)",
    created_at: "2026-04-17T11:00:00Z",
  },
  {
    id: "a15", account_id: "demo-account", household_id: "demo-household",
    action: "recipe.delete", target_type: "recipe", target_id: "rec-002",
    diff: { title: ["Old casserole", null] },
    ip_address: "192.168.1.10", user_agent: "Mozilla/5.0 (Macintosh)",
    created_at: "2026-04-16T19:00:00Z",
  },
  {
    id: "a16", account_id: "demo-account", household_id: "demo-household",
    action: "household.update", target_type: "household", target_id: "demo-household",
    diff: { timezone: ["America/Chicago", "America/New_York"] },
    ip_address: "192.168.1.10", user_agent: "Mozilla/5.0 (Macintosh)",
    created_at: "2026-04-15T08:00:00Z",
  },
  {
    id: "a17", account_id: "demo-account", household_id: "demo-household",
    action: "member.delete", target_type: "member", target_id: "mbr-099",
    diff: { name: ["Guest", null] },
    ip_address: "192.168.1.10", user_agent: "Mozilla/5.0 (Macintosh)",
    created_at: "2026-04-14T14:00:00Z",
  },
  {
    id: "a18", account_id: "demo-account", household_id: "demo-household",
    action: "backup.create", target_type: "backup", target_id: "bkp-2026-04-14",
    diff: { size_bytes: [null, 198656] },
    ip_address: "192.168.1.1", user_agent: "TidyboardBackup/1.0",
    created_at: "2026-04-14T03:00:00Z",
  },
  {
    id: "a19", account_id: "demo-account", household_id: "demo-household",
    action: "list.update", target_type: "list", target_id: "lst-002",
    diff: { name: ["Shopping", "Weekly groceries"] },
    ip_address: "192.168.1.12", user_agent: "Mozilla/5.0 (iPad)",
    created_at: "2026-04-13T10:00:00Z",
  },
  {
    id: "a20", account_id: "demo-account", household_id: "demo-household",
    action: "event.update", target_type: "event", target_id: "evt-002",
    diff: { members: [["mbr-001"], ["mbr-001", "mbr-003"]] },
    ip_address: "192.168.1.10", user_agent: "Mozilla/5.0 (Macintosh)",
    created_at: "2026-04-12T16:00:00Z",
  },
];

export const fallback = {
  events(): TBDEvent[] {
    return TBD.events;
  },
  members(): Member[] {
    return TBD.members;
  },
  recipes(): Recipe[] {
    return TBD.recipes;
  },
  recipe(id: string): Recipe | undefined {
    return TBD.recipes.find((r) => r.id === id);
  },
  lists(): FamilyList[] {
    if (isApiFallbackMode()) return TBD.lists;
    return [];
  },
  list(id: string): FamilyList | undefined {
    return TBD.lists.find((l) => l.id === id);
  },
  shopping(): Shopping {
    if (isApiFallbackMode()) return TBD.shopping;
    return { weekOf: new Date().toISOString().slice(0, 10), fromRecipes: 0, categories: [] };
  },
  routines(): Routine[] {
    // data.ts stores a single legacy-shape routine; remap into the ApiRoutine
    // shape the screens consume (member_id, est_minutes, icon, etc.). Without
    // this remap, RoutineKid calls getMember("") which returns undefined and
    // throws when reading .color, blanking the page.
    const r = TBD.routine;
    const apiShape = {
      id: "stub-routine-1",
      household_id: "stub-household",
      name: r.name,
      member_id: "jackson",
      days_of_week: ["mon", "tue", "wed", "thu", "fri"],
      time_slot: "morning",
      archived: false,
      sort_order: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      steps: r.steps.map((s, i) => ({
        id: s.id,
        routine_id: "stub-routine-1",
        name: s.name,
        est_minutes: s.min,
        sort_order: i,
        icon: s.emoji,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })),
    };
    return [apiShape as unknown as Routine];
  },
  equity(): Equity {
    return TBD.equity;
  },
  mealPlan(): MealPlan {
    if (isApiFallbackMode()) return TBD.mealPlan;
    return {
      weekOf: new Date().toISOString().slice(0, 10),
      rows: ["Breakfast", "Lunch", "Dinner", "Snack"],
      grid: Array(4).fill(null).map(() => Array(7).fill(null)),
    };
  },
  race(): Race {
    return TBD.race;
  },
  audit(
    limit = 50,
    offset = 0,
    filters?: { action?: string; target_type?: string; from?: string; to?: string }
  ): ListAuditResponse {
    let entries = [...MOCK_AUDIT_ENTRIES];
    if (filters?.action) {
      entries = entries.filter((e) => e.action === filters.action);
    }
    if (filters?.target_type) {
      entries = entries.filter((e) => e.target_type === filters.target_type);
    }
    if (filters?.from) {
      const from = new Date(filters.from).getTime();
      entries = entries.filter((e) => new Date(e.created_at).getTime() >= from);
    }
    if (filters?.to) {
      const to = new Date(filters.to).getTime();
      entries = entries.filter((e) => new Date(e.created_at).getTime() <= to);
    }
    const total = entries.length;
    return {
      entries: entries.slice(offset, offset + limit),
      total,
      limit,
      offset,
    };
  },
  chores(memberId?: string): ApiChore[] {
    const childId = memberId ?? "jackson";
    const now = new Date().toISOString();
    return [
      { id: "c1", household_id: "h1", member_id: childId, name: "Brush teeth", weight: 1, frequency_kind: "daily", days_of_week: [], auto_approve: true, archived_at: null, created_at: now, updated_at: now },
      { id: "c2", household_id: "h1", member_id: childId, name: "Make bed",     weight: 2, frequency_kind: "daily", days_of_week: [], auto_approve: true, archived_at: null, created_at: now, updated_at: now },
      { id: "c3", household_id: "h1", member_id: childId, name: "Take out trash", weight: 5, frequency_kind: "weekly", days_of_week: [], auto_approve: true, archived_at: null, created_at: now, updated_at: now },
    ];
  },
  choreCompletions(_: { from: string; to: string; memberId?: string }): ApiChoreCompletion[] {
    return [];
  },
  wallet(memberId: string): ApiWalletGetResponse {
    const now = new Date().toISOString();
    return {
      wallet: { id: "w1", member_id: memberId, balance_cents: 480, updated_at: now },
      transactions: [
        { id: "t1", wallet_id: "w1", member_id: memberId, amount_cents: 30,  kind: "chore_payout", reference_id: null, reason: "Brush teeth", created_at: now },
        { id: "t2", wallet_id: "w1", member_id: memberId, amount_cents: 250, kind: "tip",          reference_id: null, reason: "Helping with groceries", created_at: now },
        { id: "t3", wallet_id: "w1", member_id: memberId, amount_cents: 200, kind: "chore_payout", reference_id: null, reason: "Take out trash",         created_at: now },
      ],
    };
  },
  pointCategories(): ApiPointCategory[] {
    if (!isApiFallbackMode()) return [];
    const now = new Date().toISOString();
    return [
      { id: "cat-kindness",       household_id: "h1", name: "Kindness",       color: "#ec4899", sort_order: 1, archived_at: null, created_at: now, updated_at: now },
      { id: "cat-effort",         household_id: "h1", name: "Effort",         color: "#10b981", sort_order: 2, archived_at: null, created_at: now, updated_at: now },
      { id: "cat-responsibility", household_id: "h1", name: "Responsibility", color: "#f59e0b", sort_order: 3, archived_at: null, created_at: now, updated_at: now },
      { id: "cat-listening",      household_id: "h1", name: "Listening",      color: "#3b82f6", sort_order: 4, archived_at: null, created_at: now, updated_at: now },
    ];
  },
  behaviors(categoryId?: string): ApiBehavior[] {
    if (!isApiFallbackMode()) return [];
    const now = new Date().toISOString();
    const all: ApiBehavior[] = [
      { id: "b1", household_id: "h1", category_id: "cat-kindness",       name: "Helped a sibling",          suggested_points: 3, archived_at: null, created_at: now, updated_at: now },
      { id: "b2", household_id: "h1", category_id: "cat-effort",         name: "Did homework w/o reminder", suggested_points: 5, archived_at: null, created_at: now, updated_at: now },
      { id: "b3", household_id: "h1", category_id: "cat-responsibility", name: "Cleaned up own mess",       suggested_points: 2, archived_at: null, created_at: now, updated_at: now },
      { id: "b4", household_id: "h1", category_id: "cat-listening",      name: "First-time listener",       suggested_points: 4, archived_at: null, created_at: now, updated_at: now },
    ];
    return categoryId ? all.filter(b => b.category_id === categoryId) : all;
  },
  pointsBalance(memberId: string): ApiPointsBalance {
    if (!isApiFallbackMode()) return { member_id: memberId, total: 0, by_category: [], recent: [] };
    const now = new Date().toISOString();
    return {
      member_id: memberId,
      total: 47,
      by_category: [
        { category_id: "cat-kindness",       total: 12 },
        { category_id: "cat-effort",         total: 20 },
        { category_id: "cat-responsibility", total: 10 },
        { category_id: "cat-listening",      total: 5 },
      ],
      recent: [
        { id: "g1", points: 3,   reason: "Helped Theo find his shoe",   category_id: "cat-kindness", behavior_id: "b1", granted_at: now },
        { id: "g2", points: 5,   reason: "Started homework right away", category_id: "cat-effort",   behavior_id: "b2", granted_at: now },
        { id: "g3", points: -10, reason: "Redeemed: stickers",          category_id: null,           behavior_id: null, granted_at: now },
      ],
    };
  },
  scoreboard(): ApiScoreboardEntry[] {
    if (!isApiFallbackMode()) return [];
    return [
      { member_id: "m1", total: 84, by_category: [{ category_id: "cat-effort", total: 40 }, { category_id: "cat-kindness", total: 24 }, { category_id: "cat-responsibility", total: 12 }, { category_id: "cat-listening", total: 8 }] },
      { member_id: "m2", total: 47, by_category: [{ category_id: "cat-effort", total: 20 }, { category_id: "cat-kindness", total: 12 }, { category_id: "cat-responsibility", total: 10 }, { category_id: "cat-listening", total: 5 }] },
    ];
  },
  rewards(): ApiReward[] {
    if (!isApiFallbackMode()) return [];
    const now = new Date().toISOString();
    return [
      { id: "r1", household_id: "h1", name: "Stickers",         description: "Sheet of stickers",     image_url: null, cost_points: 30,  fulfillment_kind: "self_serve",     active: true, created_at: now, updated_at: now },
      { id: "r2", household_id: "h1", name: "Movie night pick", description: "Pick the family movie", image_url: null, cost_points: 75,  fulfillment_kind: "needs_approval", active: true, created_at: now, updated_at: now },
      { id: "r3", household_id: "h1", name: "Xbox game",        description: "$60 budget",            image_url: null, cost_points: 500, fulfillment_kind: "needs_approval", active: true, created_at: now, updated_at: now },
    ];
  },
  redemptions(): ApiRedemption[] {
    if (!isApiFallbackMode()) return [];
    const now = new Date().toISOString();
    return [
      { id: "rd1", household_id: "h1", reward_id: "r1", member_id: "m1", points_at_redemption: 30, status: "fulfilled", requested_at: now, decided_at: now, decided_by_account_id: null, fulfilled_at: now,  decline_reason: "", grant_id: null },
      { id: "rd2", household_id: "h1", reward_id: "r2", member_id: "m2", points_at_redemption: 75, status: "pending",   requested_at: now, decided_at: null, decided_by_account_id: null, fulfilled_at: null, decline_reason: "", grant_id: null },
    ];
  },
  timeline(memberId: string): ApiTimelineEvent[] {
    if (!isApiFallbackMode()) {
      void memberId;
      return [];
    }
    const now = new Date().toISOString();
    void memberId; // mark used
    return [
      { kind: "point_grant",            id: "g1",  occurred_at: now, amount: 3,  reason: "Helped Theo",   ref_a: "b1",           ref_b: "cat-kindness" },
      { kind: "wallet_transaction",     id: "t1",  occurred_at: now, amount: 30, reason: "Brush teeth",   ref_a: "chore_payout", ref_b: null },
      { kind: "redemption",             id: "rd1", occurred_at: now, amount: 30, reason: "approved",      ref_a: "r1",           ref_b: null },
      { kind: "reward_cost_adjustment", id: "a1",  occurred_at: now, amount: 25, reason: "Hit at school", ref_a: "r3",           ref_b: null },
    ];
  },
};

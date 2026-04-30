/**
 * API layer types. Re-exports data.ts domain types so screens can migrate
 * from `import { ... } from "@/lib/data"` to `import { ... } from "@/lib/api/types"`
 * without changing type shapes.
 */

// Re-export all domain types from data.ts
export type {
  Role,
  Member,
  TBDEvent,
  WeekItem,
  WeekDay,
  RoutineStep,
  Routine,
  Ingredient,
  Recipe,
  MealPlan,
  ShoppingItem,
  ShoppingCategory,
  Shopping,
  EquityAdult,
  Domain,
  TrendPoint,
  Equity,
  RaceParticipant,
  RaceItem,
  Race,
  ListItem,
  FamilyList,
} from "@/lib/data";

// ── API-specific types ──────────────────────────────────────────────────────

export interface ApiError {
  code: string;
  message: string;
  status: number;
}

// ── Audit types ─────────────────────────────────────────────────────────────

export interface AuditEntry {
  id: string;
  account_id: string;
  household_id: string | null;
  action: string;
  target_type: string;
  target_id: string;
  diff: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface ListAuditResponse {
  entries: AuditEntry[];
  total: number;
  limit: number;
  offset: number;
}

export interface AuthToken {
  token: string;
  expiresAt?: string;
}

export interface PagedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

// ── Equity engine types (backend shapes) ───────────────────────────────────

export interface ApiTaskDomain {
  id: string;
  household_id: string;
  name: string;
  icon: string;
  description: string;
  is_system: boolean;
  sort_order: number;
  owner_member_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApiEquityTask {
  id: string;
  household_id: string;
  domain_id: string;
  name: string;
  task_type: "cognitive" | "physical" | "both";
  recurrence: string;
  est_minutes: number;
  owner_member_id?: string | null;
  share_pct: number;
  archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface ApiTaskLog {
  id: string;
  task_id: string;
  household_id: string;
  member_id: string;
  started_at: string;
  duration_minutes: number;
  is_cognitive: boolean;
  notes: string;
  source: "timer" | "manual" | "auto_estimate";
  created_at: string;
}

export interface ApiMemberEquity {
  member_id: string;
  total_minutes: number;
  cognitive_minutes: number;
  physical_minutes: number;
  load_pct: number;
  load_status: "green" | "yellow" | "red";
  domains_owned: number;
  tasks_owned: number;
}

export interface ApiDomainSummary {
  domain_id: string;
  name: string;
  icon: string;
  owner_member_id?: string | null;
  total_minutes: number;
  task_count: number;
}

export interface ApiTrendPoint {
  week_start: string;
  minutes: Record<string, number>; // member_id → minutes
}

export interface ApiEquityDashboard {
  from: string;
  to: string;
  members: ApiMemberEquity[];
  domain_list: ApiDomainSummary[];
  trend: ApiTrendPoint[];
}

export interface ApiRebalanceSuggestion {
  from_member_id: string;
  to_member_id: string;
  task_id: string;
  task_name: string;
  domain_name: string;
  est_minutes: number;
  reason: string;
}

export interface CreateEquityTaskRequest {
  domain_id: string;
  name: string;
  task_type?: "cognitive" | "physical" | "both";
  recurrence?: string;
  est_minutes?: number;
  owner_member_id?: string | null;
  share_pct?: number;
}

export interface UpdateEquityTaskRequest {
  domain_id?: string;
  name?: string;
  task_type?: "cognitive" | "physical" | "both";
  recurrence?: string;
  est_minutes?: number;
  owner_member_id?: string | null;
  share_pct?: number;
  archived?: boolean;
}

export interface LogTaskTimeRequest {
  member_id: string;
  started_at?: string;
  duration_minutes: number;
  is_cognitive?: boolean;
  notes?: string;
  source?: "timer" | "manual" | "auto_estimate";
}

// ── Routine backend types ───────────────────────────────────────────────────

export interface ApiRoutineStep {
  id: string;
  routine_id: string;
  name: string;
  est_minutes?: number | null;
  sort_order: number;
  icon?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApiRoutine {
  id: string;
  household_id: string;
  name: string;
  member_id?: string | null;
  days_of_week: string[];
  time_slot: "morning" | "evening" | "anytime";
  archived: boolean;
  sort_order: number;
  steps: ApiRoutineStep[];
  created_at: string;
  updated_at: string;
}

export interface ApiCompletion {
  id: string;
  routine_id: string;
  step_id?: string | null;
  member_id: string;
  completed_at: string;
}

export interface ApiStreakResponse {
  routine_id: string;
  member_id: string;
  streak: number;
}

export interface CreateRoutineRequest {
  name: string;
  member_id?: string | null;
  days_of_week?: string[];
  time_slot?: "morning" | "evening" | "anytime";
  sort_order?: number;
}

export interface UpdateRoutineRequest {
  name?: string;
  member_id?: string | null;
  days_of_week?: string[];
  time_slot?: "morning" | "evening" | "anytime";
  archived?: boolean;
  sort_order?: number;
}

export interface AddStepRequest {
  name: string;
  est_minutes?: number | null;
  sort_order?: number;
  icon?: string | null;
}

export interface UpdateStepRequest {
  name?: string;
  est_minutes?: number | null;
  sort_order?: number;
  icon?: string | null;
}

export interface MarkCompleteRequest {
  step_id?: string | null;
  member_id: string;
}

// ── Invite / Join-request types ────────────────────────────────────────────

export interface JoinRequest {
  id: string;
  household_id: string;
  account_id: string;
  requested_at: string;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  status: "pending" | "approved" | "rejected";
}

export interface HouseholdPreview {
  household_id: string;
  name: string;
  invite_code: string;
}

// ── Recipe Collection types ─────────────────────────────────────────────────

export interface RecipeCollection {
  id: string;
  household_id: string;
  name: string;
  slug: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CreateCollectionRequest {
  name: string;
  sort_order?: number;
}

export interface UpdateCollectionRequest {
  name?: string;
  sort_order?: number;
}

// ── Wallet / Chore types ────────────────────────────────────────────────────

export interface ApiChore {
  id: string;
  household_id: string;
  member_id: string;
  name: string;
  weight: number;
  frequency_kind: "daily" | "weekdays" | "specific_days" | "weekly";
  days_of_week: string[];
  auto_approve: boolean;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApiChoreCompletion {
  id: string;
  chore_id: string;
  member_id: string;
  date: string;
  marked_at: string;
  approved: boolean;
  payout_cents: number;
  closed: boolean;
}

export interface ApiWallet {
  id: string;
  member_id: string;
  balance_cents: number;
  updated_at: string;
}

export interface ApiWalletTransaction {
  id: string;
  wallet_id: string;
  member_id: string;
  amount_cents: number;
  kind: "chore_payout" | "streak_bonus" | "tip" | "ad_hoc" | "cash_out" | "adjustment";
  reference_id: string | null;
  reason: string;
  created_at: string;
}

export interface ApiWalletGetResponse {
  wallet: ApiWallet;
  transactions: ApiWalletTransaction[];
}

export interface ApiAllowance {
  id: string;
  household_id: string;
  member_id: string;
  amount_cents: number;
  active_from: string;
  created_at: string;
}

export interface ApiAdHocTask {
  id: string;
  household_id: string;
  member_id: string;
  name: string;
  payout_cents: number;
  requires_approval: boolean;
  status: "open" | "pending" | "approved" | "declined";
  completed_at: string | null;
  approved_at: string | null;
  decline_reason: string;
  expires_at: string | null;
  created_at: string;
}

// ── Points / Rewards types ──────────────────────────────────────────────────

export interface ApiPointCategory {
  id: string;
  household_id: string;
  name: string;
  color: string;
  sort_order: number;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApiBehavior {
  id: string;
  household_id: string;
  category_id: string;
  name: string;
  suggested_points: number;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApiPointGrant {
  id: string;
  household_id: string;
  member_id: string;
  category_id: string | null;
  behavior_id: string | null;
  points: number;
  reason: string;
  granted_by_account_id: string | null;
  granted_at: string;
}

export interface ApiCategoryTotal {
  category_id: string | null;
  total: number;
}

export interface ApiPointGrantSummary {
  id: string;
  points: number;
  reason: string;
  category_id: string | null;
  behavior_id: string | null;
  granted_at: string;
}

export interface ApiPointsBalance {
  member_id: string;
  total: number;
  by_category: ApiCategoryTotal[];
  recent: ApiPointGrantSummary[];
}

export interface ApiScoreboardEntry {
  member_id: string;
  total: number;
  by_category: ApiCategoryTotal[];
}

export interface ApiReward {
  id: string;
  household_id: string;
  name: string;
  description: string;
  image_url: string | null;
  cost_points: number;
  fulfillment_kind: "self_serve" | "needs_approval";
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ApiRedemption {
  id: string;
  household_id: string;
  reward_id: string;
  member_id: string;
  points_at_redemption: number;
  status: "pending" | "approved" | "fulfilled" | "declined";
  requested_at: string;
  decided_at: string | null;
  decided_by_account_id: string | null;
  fulfilled_at: string | null;
  decline_reason: string;
  grant_id: string | null;
}

export interface ApiRedeemResponse {
  redemption_id: string;
  status: "approved" | "pending";
  points_charged: number;
  new_balance: number;
  effective_cost: number;
}

export interface ApiSavingsGoal {
  id: string;
  member_id: string;
  reward_id: string;
  started_at: string;
  cleared_at: string | null;
}

export interface ApiRewardCostAdjustment {
  id: string;
  household_id: string;
  member_id: string;
  reward_id: string;
  delta_points: number;
  reason: string;
  expires_at: string | null;
  created_by_account_id: string | null;
  created_at: string;
}

export interface ApiTimelineEvent {
  kind: "point_grant" | "redemption" | "reward_cost_adjustment" | "wallet_transaction";
  id: string;
  occurred_at: string;
  amount: number;
  reason: string;
  ref_a: string | null;
  ref_b: string | null;
}

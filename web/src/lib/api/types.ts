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

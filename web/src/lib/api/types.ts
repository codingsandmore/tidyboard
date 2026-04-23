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

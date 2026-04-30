/**
 * Production fallback guard.
 *
 * Tidyboard must not fabricate a demo household when the API is unavailable.
 * This module is kept only as a compatibility surface for hooks that still
 * reference `fallback.*`; every method returns an empty value and
 * `isApiFallbackMode()` is always false.
 */

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

export function isApiFallbackMode(): boolean {
  return false;
}

function emptyShopping(): Shopping {
  return {
    weekOf: new Date().toISOString().slice(0, 10),
    fromRecipes: 0,
    categories: [],
  };
}

function emptyMealPlan(): MealPlan {
  return {
    weekOf: new Date().toISOString().slice(0, 10),
    rows: ["Breakfast", "Lunch", "Dinner", "Snack"],
    grid: Array.from({ length: 4 }, () => Array(7).fill(null)),
  };
}

function emptyEquity(): Equity {
  return {
    period: "",
    domains: 0,
    adults: [],
    domainList: [],
    trend: [],
  };
}

function emptyRace(): Race {
  return {
    name: "",
    countdownSec: 0,
    totalSec: 0,
    participants: [],
    items: [],
  };
}

export const fallback = {
  events(): TBDEvent[] {
    return [];
  },
  members(): Member[] {
    return [];
  },
  recipes(): Recipe[] {
    return [];
  },
  recipe(_: string): Recipe | undefined {
    return undefined;
  },
  lists(): FamilyList[] {
    return [];
  },
  list(_: string): FamilyList | undefined {
    return undefined;
  },
  shopping(): Shopping {
    return emptyShopping();
  },
  routines(): Routine[] {
    return [];
  },
  equity(): Equity {
    return emptyEquity();
  },
  mealPlan(): MealPlan {
    return emptyMealPlan();
  },
  race(): Race {
    return emptyRace();
  },
  audit(
    limit = 50,
    offset = 0,
    _filters?: { action?: string; target_type?: string; from?: string; to?: string }
  ): ListAuditResponse {
    return {
      entries: [],
      total: 0,
      limit,
      offset,
    };
  },
  chores(_: string | undefined): ApiChore[] {
    return [];
  },
  choreCompletions(_: { from: string; to: string; memberId?: string }): ApiChoreCompletion[] {
    return [];
  },
  wallet(memberId: string): ApiWalletGetResponse {
    return {
      wallet: {
        id: "",
        member_id: memberId,
        balance_cents: 0,
        updated_at: new Date().toISOString(),
      },
      transactions: [],
    };
  },
  pointCategories(): ApiPointCategory[] {
    return [];
  },
  behaviors(_: string | undefined): ApiBehavior[] {
    return [];
  },
  pointsBalance(memberId: string): ApiPointsBalance {
    return {
      member_id: memberId,
      total: 0,
      by_category: [],
      recent: [],
    };
  },
  scoreboard(): ApiScoreboardEntry[] {
    return [];
  },
  rewards(): ApiReward[] {
    return [];
  },
  redemptions(): ApiRedemption[] {
    return [];
  },
  timeline(_: string): ApiTimelineEvent[] {
    return [];
  },
};

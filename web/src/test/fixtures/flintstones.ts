/**
 * Flintstones + Rubbles canonical test fixtures.
 *
 * UUIDs MUST exactly match the Go seed package
 * (internal/test/seed/flintstones.go). Cross-language tests rely on
 * byte-for-byte identical IDs.
 *
 * Shape mirrors what the live API returns, NOT what tests find convenient:
 *   - events have `assigned_members` populated; `members` is intentionally
 *     undefined (the regression-class trap from the type-widening cycle —
 *     consumers that direct-access `event.members.length` will crash here).
 *   - recipe_ingredients and recipe_steps are always arrays (`[]` when
 *     empty, never undefined) — matches the #109 serialization fix.
 *   - pet-only fields (last_fed_at, etc.) are omitted because the feature
 *     does not exist in production yet.
 *
 * Spec: docs/specs/2026-05-01-flintstones-design.md, section B.3.
 */

// ── Flintstones household ──────────────────────────────────────────────────

export const FLINTSTONE_ACCOUNT_ID = "19c6edce-f6fe-5f2c-ade8-3e8464805f21";
export const FLINTSTONE_HOUSEHOLD_ID = "1d7515c6-2bae-5d07-951a-3cc6d2995e02";
export const FRED_ID = "5bd9753c-67d6-544a-84aa-caffd7bdeb58";
export const WILMA_ID = "30b09690-0d54-5b9f-9772-97d45baf0d4d";
export const PEBBLES_ID = "83184747-32c0-5857-b783-e84513513100";
export const DINO_ID = "0069ffc4-a6ea-5a04-bbc4-2dbeb293b92b";

export const FLINTSTONE_BOWLING_EVENT_ID = "0f8b77b1-5be8-5e50-a49c-90bb23d125fc";
export const FLINTSTONE_BIRTHDAY_EVENT_ID = "ff2e27f5-b256-5b7c-8649-0847bf81e893";
export const FLINTSTONE_COUNTDOWN_EVENT_ID = "8878594e-dd4f-5785-bf32-ae55c6a84cf2";
export const FLINTSTONE_RECIPE_BRONTO_ID = "fa9ca7f1-4a0d-5b2f-839e-c38bb05ce236";
export const FLINTSTONE_RECIPE_SALAD_ID = "e110bd40-4f37-524e-99d1-ec620ffe2815";
export const FLINTSTONE_RECIPE_COOKIES_ID = "1c612ab9-3907-5eef-9a88-b7a72fa18c3e";
export const FLINTSTONE_COLLECTION_ID = "4e29d9d3-4c5c-5991-9109-9596233ebc68";
export const FLINTSTONE_SHOPPING_LIST_ID = "4683e0e2-e2e8-5e9f-a9cb-0c5d0809cd6c";
export const FLINTSTONE_CHORE_FEED_DINO_ID = "bc9110f8-e761-5bed-9072-536030b14223";
export const FLINTSTONE_CHORE_WASH_DISHES_ID = "aa1ce864-0610-5431-bb08-dec72ece12ca";
export const FLINTSTONE_ROUTINE_ID = "ab61314b-2418-5c39-959c-53d5dc04039c";
export const FLINTSTONE_REWARD_TV_ID = "dba5fa13-7b14-5cd8-817f-9bf5c439cadc";
export const FLINTSTONE_POINTS_CATEGORY_ID = "4b51b3b8-2b88-5b88-ad9f-9c1a44e58e3a";
export const FLINTSTONE_POINTS_GRANT_ID = "41735319-1613-5bcf-adbe-486da29897ef";

// ── Rubbles household ──────────────────────────────────────────────────────

export const RUBBLE_ACCOUNT_ID = "8d8df268-af52-5026-af8c-ed39db47b936";
export const RUBBLE_HOUSEHOLD_ID = "2652058f-e5ca-5c9f-9e55-599fa484dca9";
export const BARNEY_ID = "fbe0b777-3de4-540d-8512-f12774cee81d";
export const BETTY_ID = "8dcc8934-ed2b-51a0-bd3f-d323f4d27fbe";
export const BAMM_BAMM_ID = "7be75ecc-51e5-59c3-b3ee-10e68dd18fd9";
export const HOPPY_ID = "87d91cb1-9e97-50bd-9e71-2e368ce715e1";

export const RUBBLE_BOWLING_EVENT_ID = "22610a2e-1f11-5afb-add3-adc341300a9a";
export const RUBBLE_RECIPE_BRONTO_ID = "69ec53e4-b744-585d-9c84-87aee707cc09";

// ── Member shape (mirrors live /v1/members response) ───────────────────────

export type FixtureMember = {
  id: string;
  household_id: string;
  name: string;
  display_name: string;
  role: "admin" | "member" | "child" | "pet";
  age_group: "adult" | "child" | "pet";
  color: string;
};

export const fred: FixtureMember = {
  id: FRED_ID,
  household_id: FLINTSTONE_HOUSEHOLD_ID,
  name: "Fred",
  display_name: "Fred",
  role: "admin",
  age_group: "adult",
  color: "#4A90E2",
};

export const wilma: FixtureMember = {
  id: WILMA_ID,
  household_id: FLINTSTONE_HOUSEHOLD_ID,
  name: "Wilma",
  display_name: "Wilma",
  role: "admin",
  age_group: "adult",
  color: "#4A90E2",
};

export const pebbles: FixtureMember = {
  id: PEBBLES_ID,
  household_id: FLINTSTONE_HOUSEHOLD_ID,
  name: "Pebbles",
  display_name: "Pebbles",
  role: "child",
  age_group: "child",
  color: "#4A90E2",
};

export const dino: FixtureMember = {
  id: DINO_ID,
  household_id: FLINTSTONE_HOUSEHOLD_ID,
  name: "Dino",
  display_name: "Dino",
  role: "pet",
  age_group: "pet",
  color: "#4A90E2",
};

export const barney: FixtureMember = {
  id: BARNEY_ID,
  household_id: RUBBLE_HOUSEHOLD_ID,
  name: "Barney",
  display_name: "Barney",
  role: "admin",
  age_group: "adult",
  color: "#4A90E2",
};

export const betty: FixtureMember = {
  id: BETTY_ID,
  household_id: RUBBLE_HOUSEHOLD_ID,
  name: "Betty",
  display_name: "Betty",
  role: "admin",
  age_group: "adult",
  color: "#4A90E2",
};

export const bammBamm: FixtureMember = {
  id: BAMM_BAMM_ID,
  household_id: RUBBLE_HOUSEHOLD_ID,
  name: "Bamm-Bamm",
  display_name: "Bamm-Bamm",
  role: "child",
  age_group: "child",
  color: "#4A90E2",
};

export const hoppy: FixtureMember = {
  id: HOPPY_ID,
  household_id: RUBBLE_HOUSEHOLD_ID,
  name: "Hoppy",
  display_name: "Hoppy",
  role: "pet",
  age_group: "pet",
  color: "#4A90E2",
};

// ── Event shape (mirrors live /v1/events response) ─────────────────────────
//
// CRITICAL: `assigned_members` is set, `members` is INTENTIONALLY undefined.
// This is the regression-class trap from spec section B.3 — any consumer
// that direct-accesses `event.members.length` (instead of
// `event.assigned_members ?? event.members ?? []`) will crash on these
// fixtures, surfacing the bug at PR-CI time.

export type FixtureEvent = {
  id: string;
  household_id: string;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  all_day: boolean;
  location: string;
  assigned_members: string[];
  // members is intentionally absent — see file header.
  reminders: unknown[];
};

export const flintstoneBowlingEvent: FixtureEvent = {
  id: FLINTSTONE_BOWLING_EVENT_ID,
  household_id: FLINTSTONE_HOUSEHOLD_ID,
  title: "Bedrock Bowling Night",
  description: "Seeded by Flintstones test family",
  start_time: "2026-05-06T12:00:00Z",
  end_time: "2026-05-06T14:00:00Z",
  all_day: false,
  location: "Bedrock",
  assigned_members: [FRED_ID, WILMA_ID],
  reminders: [],
};

export const flintstoneBirthdayEvent: FixtureEvent = {
  id: FLINTSTONE_BIRTHDAY_EVENT_ID,
  household_id: FLINTSTONE_HOUSEHOLD_ID,
  title: "Pebbles's Birthday",
  description: "Seeded by Flintstones test family",
  start_time: "2026-04-01T12:00:00Z",
  end_time: "2026-04-01T15:00:00Z",
  all_day: false,
  location: "Bedrock",
  assigned_members: [FRED_ID, WILMA_ID, PEBBLES_ID],
  reminders: [],
};

export const flintstoneCountdownEvent: FixtureEvent = {
  id: FLINTSTONE_COUNTDOWN_EVENT_ID,
  household_id: FLINTSTONE_HOUSEHOLD_ID,
  title: "Family Vacation Countdown",
  description: "Seeded by Flintstones test family",
  start_time: "2026-05-11T12:00:00Z",
  end_time: "2026-05-11T13:00:00Z",
  all_day: false,
  location: "Bedrock",
  assigned_members: [FRED_ID, WILMA_ID, PEBBLES_ID],
  reminders: [],
};

// ── Recipe shape (mirrors live /v1/recipes response) ───────────────────────

export type FixtureIngredient = {
  id: string;
  recipe_id: string;
  name: string;
  amount: number;
  unit: string;
  sort_order: number;
};

export type FixtureStep = {
  id: string;
  recipe_id: string;
  text: string;
  sort_order: number;
};

export type FixtureRecipe = {
  id: string;
  household_id: string;
  title: string;
  servings: number;
  difficulty: "easy" | "medium" | "hard";
  recipe_ingredients: FixtureIngredient[];
  recipe_steps: FixtureStep[];
};

export const flintstoneBrontoRecipe: FixtureRecipe = {
  id: FLINTSTONE_RECIPE_BRONTO_ID,
  household_id: FLINTSTONE_HOUSEHOLD_ID,
  title: "Brontosaurus Steak",
  servings: 4,
  difficulty: "easy",
  recipe_ingredients: [
    { id: "00000000-0000-0000-0000-000000000001", recipe_id: FLINTSTONE_RECIPE_BRONTO_ID, name: "brontosaurus", amount: 2, unit: "lb", sort_order: 0 },
    { id: "00000000-0000-0000-0000-000000000002", recipe_id: FLINTSTONE_RECIPE_BRONTO_ID, name: "salt", amount: 1, unit: "tbsp", sort_order: 1 },
    { id: "00000000-0000-0000-0000-000000000003", recipe_id: FLINTSTONE_RECIPE_BRONTO_ID, name: "pepper", amount: 1, unit: "tsp", sort_order: 2 },
    { id: "00000000-0000-0000-0000-000000000004", recipe_id: FLINTSTONE_RECIPE_BRONTO_ID, name: "olive oil", amount: 2, unit: "tbsp", sort_order: 3 },
  ],
  recipe_steps: [
    { id: "00000000-0000-0000-0000-000000000011", recipe_id: FLINTSTONE_RECIPE_BRONTO_ID, text: "Season the brontosaurus.", sort_order: 0 },
    { id: "00000000-0000-0000-0000-000000000012", recipe_id: FLINTSTONE_RECIPE_BRONTO_ID, text: "Grill over hot stones for 12 minutes.", sort_order: 1 },
    { id: "00000000-0000-0000-0000-000000000013", recipe_id: FLINTSTONE_RECIPE_BRONTO_ID, text: "Rest 5 minutes and serve.", sort_order: 2 },
  ],
};

// ── Bundles ────────────────────────────────────────────────────────────────

export const flintstones = {
  household: {
    id: FLINTSTONE_HOUSEHOLD_ID,
    name: "Flintstones",
    timezone: "America/Los_Angeles",
  },
  fred,
  wilma,
  pebbles,
  dino,
  members: [fred, wilma, pebbles, dino],
  events: {
    bowlingNight: flintstoneBowlingEvent,
    birthday: flintstoneBirthdayEvent,
    countdown: flintstoneCountdownEvent,
  },
  recipes: {
    bronto: flintstoneBrontoRecipe,
  },
};

export const rubbles = {
  household: {
    id: RUBBLE_HOUSEHOLD_ID,
    name: "Rubbles",
    timezone: "America/Los_Angeles",
  },
  barney,
  betty,
  bammBamm,
  hoppy,
  members: [barney, betty, bammBamm, hoppy],
};

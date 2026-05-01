// Sample data — the Smith family, per the brief
// Matches specs/design/data.jsx

export type Role = "adult" | "child" | "pet";

export type Member = {
  id: string;
  name: string;
  full: string;
  role: Role;
  display_name?: string;
  age_group?: "adult" | "child" | "pet" | "toddler" | "tween" | "teen";
  color: string;
  initial: string;
  stars: number;
  streak: number;
};

export type TBDEvent = {
  id: string;
  title: string;
  start: string;
  end: string;
  members: string[];
  location?: string;
  type?: string;
  // Optional ISO timestamps + RRULE used by the API; backwards compatible
  // with the legacy `start`/`end` HH:mm strings used by sample fixtures.
  start_time?: string;
  end_time?: string;
  description?: string;
  recurrence_rule?: string;
  /**
   * Server-side member IDs assigned to this event (per /v1/events response).
   * Sample fixtures populate `members` instead; consumers should read both
   * via `event.assigned_members ?? event.members ?? []`.
   */
  assigned_members?: string[];
};

export type WeekItem = { m: string; t: string; h: number };
export type WeekDay = { day: string; date: number; items: WeekItem[] };

export type RoutineStep = {
  id: string;
  emoji: string;
  name: string;
  min: number;
  done: boolean;
  active?: boolean;
};

export type Routine = {
  member: string;
  name: string;
  progress: number;
  total: number;
  minutesLeft: number;
  steps: RoutineStep[];
};

export type Ingredient = { amt: string; name: string };

export type Recipe = {
  id: string;
  title: string;
  source: string;
  prep: number;
  cook: number;
  total: number;
  serves: number;
  rating: number;
  tag: string[];
  ingredients?: Ingredient[];
  steps?: string[];
};

/**
 * Per-entry metadata keyed by `${date}|${slot}` (e.g. "2026-04-27|dinner").
 * Backed by the meal_plan_entries table; only present for filled grid cells.
 */
export type MealPlanEntryMeta = {
  /** Backend UUID for the entry, used by DELETE /v1/meal-plan/{id}. */
  id: string;
  /** Servings multiplier; 1.0 = recipe-default. */
  serving_multiplier?: number;
  /** Number of batches to cook. */
  batch_quantity?: number;
  /** Servings expected to remain after the meal. */
  planned_leftovers?: number;
};

export type MealPlan = {
  weekOf: string;
  rows: string[];
  grid: (string | null)[][];
  /**
   * Optional map of "${date}|${slot}" -> entry metadata. Populated by the
   * live API; absent in fixture data.
   */
  entryIds?: Record<string, MealPlanEntryMeta>;
};

export type ShoppingItem = {
  amt: string;
  name: string;
  done: boolean;
  id?: string;
  sourceRecipes?: string[];
};
export type ShoppingCategory = {
  name: string;
  pantry?: boolean;
  items: ShoppingItem[];
};
export type Shopping = {
  weekOf: string;
  fromRecipes: number;
  categories: ShoppingCategory[];
};

export type EquityAdult = {
  id: string;
  total: number;
  cognitive: number;
  physical: number;
  personalHrs: number;
  personalGoal: number;
  load: "green" | "yellow" | "red";
  loadPct: number;
};

export type Domain = {
  name: string;
  owner: string;
  hours: number;
  tasks: number;
};

export type TrendPoint = { w: string; mom: number; dad: number };

export type Equity = {
  period: string;
  domains: number;
  adults: EquityAdult[];
  domainList: Domain[];
  trend: TrendPoint[];
};

export type RaceParticipant = { id: string; progress: number; items: number };
export type RaceItem = { name: string; by: string | null };
export type Race = {
  name: string;
  countdownSec: number;
  totalSec: number;
  participants: RaceParticipant[];
  items: RaceItem[];
};

export type ListItem = {
  id: string;
  text: string;
  done: boolean;
  assignee?: string; // member id
  due?: string;      // ISO date
};

export type FamilyList = {
  id: string;
  title: string;
  category: "chores" | "packing" | "errands" | "todo";
  emoji: string;
  items: ListItem[];
};

export const TBD = {
  household: { name: "The Smith Family", id: "smith" },

  members: [
    { id: "dad", name: "Dad", full: "Mike Smith", role: "adult" as Role, color: "#3B82F6", initial: "D", stars: 0, streak: 0 },
    { id: "mom", name: "Mom", full: "Sarah Smith", role: "adult" as Role, color: "#EF4444", initial: "M", stars: 0, streak: 0 },
    { id: "jackson", name: "Jackson", full: "Jackson", role: "child" as Role, color: "#22C55E", initial: "J", stars: 15, streak: 7 },
    { id: "emma", name: "Emma", full: "Emma", role: "child" as Role, color: "#F59E0B", initial: "E", stars: 23, streak: 12 },
  ] as Member[],

  events: [
    { id: "e1", title: "Morning standup", start: "08:00", end: "08:30", members: ["dad"], location: "Home office", type: "work" },
    { id: "e2", title: "Dentist — Jackson", start: "09:00", end: "10:00", members: ["mom", "jackson"], location: "Dr. Patel, Market St" },
    { id: "e3", title: "Grocery run", start: "11:00", end: "11:45", members: ["mom"], location: "Trader Joe's" },
    { id: "e4", title: "Soccer practice", start: "15:30", end: "16:45", members: ["jackson", "emma"], location: "Riverside Field" },
    { id: "e5", title: "Piano lesson", start: "17:00", end: "17:45", members: ["emma"], location: "Ms. Chen" },
    { id: "e6", title: "Family dinner", start: "18:30", end: "19:30", members: ["dad", "mom", "jackson", "emma"], location: "Home" },
    { id: "e7", title: "Book club", start: "20:00", end: "21:30", members: ["mom"], location: "The Reading Room" },
  ] as TBDEvent[],

  week: [
    { day: "Mon", date: 19, items: [{ m: "dad", t: "Standup", h: 8 }, { m: "emma", t: "Piano", h: 17 }] },
    { day: "Tue", date: 20, items: [{ m: "mom", t: "Yoga", h: 7 }, { m: "jackson", t: "Soccer", h: 15.5 }] },
    { day: "Wed", date: 21, items: [{ m: "dad", t: "Dentist", h: 10 }, { m: "emma", t: "Ballet", h: 16 }] },
    { day: "Thu", date: 22, items: [{ m: "dad", t: "Standup", h: 8 }, { m: "mom", t: "Dentist", h: 9 }, { m: "jackson", t: "Soccer", h: 15.5 }, { m: "all", t: "Dinner", h: 18.5 }] },
    { day: "Fri", date: 23, items: [{ m: "mom", t: "Book club", h: 20 }] },
    { day: "Sat", date: 24, items: [{ m: "all", t: "Park", h: 10 }, { m: "emma", t: "Playdate", h: 14 }] },
    { day: "Sun", date: 25, items: [{ m: "all", t: "Brunch", h: 10 }] },
  ] as WeekDay[],

  routine: {
    member: "jackson",
    name: "Jackson's Morning Routine",
    progress: 3,
    total: 6,
    minutesLeft: 15,
    steps: [
      { id: "s1", emoji: "🛏️", name: "Make bed", min: 3, done: true },
      { id: "s2", emoji: "🦷", name: "Brush teeth", min: 2, done: true },
      { id: "s3", emoji: "👕", name: "Get dressed", min: 5, done: true },
      { id: "s4", emoji: "🥣", name: "Eat breakfast", min: 10, done: false, active: true },
      { id: "s5", emoji: "🎒", name: "Pack school bag", min: 4, done: false },
      { id: "s6", emoji: "👟", name: "Put shoes on", min: 2, done: false },
    ],
  } as Routine,

  recipes: [
    {
      id: "r1", title: "Spaghetti Carbonara", source: "seriouseats.com", prep: 10, cook: 20, total: 30, serves: 4, rating: 4, tag: ["italian", "pasta", "quick"],
      ingredients: [
        { amt: "1 lb", name: "spaghetti" },
        { amt: "6 oz", name: "guanciale or pancetta, diced" },
        { amt: "4", name: "large egg yolks" },
        { amt: "1", name: "whole egg" },
        { amt: "1 cup", name: "Pecorino Romano, finely grated" },
        { amt: "", name: "Black pepper, freshly ground" },
        { amt: "", name: "Salt, for pasta water" },
      ],
      steps: [
        "Bring a large pot of salted water to a boil.",
        "Cook pancetta in a wide skillet over medium heat until crisp, 6–8 min.",
        "Whisk yolks, whole egg, cheese and plenty of pepper in a bowl.",
        "Cook pasta until al dente. Reserve 1 cup pasta water.",
        "Off heat, toss pasta with pancetta and fat. Slowly add egg mixture, tossing, adding pasta water to loosen.",
        "Serve immediately with more pepper and cheese.",
      ],
    },
    { id: "r2", title: "Sheet Pan Chicken Fajitas", source: "nytimes.com", prep: 15, cook: 25, total: 40, serves: 4, rating: 5, tag: ["mexican", "weeknight"] },
    { id: "r3", title: "Miso Butter Salmon", source: "bonappetit.com", prep: 5, cook: 15, total: 20, serves: 4, rating: 5, tag: ["seafood", "quick"] },
    { id: "r4", title: "Turkey Chili", source: "smittenkitchen.com", prep: 15, cook: 45, total: 60, serves: 6, rating: 4, tag: ["stew", "batch"] },
    { id: "r5", title: "Overnight Oats", source: "loveandlemons.com", prep: 5, cook: 0, total: 5, serves: 2, rating: 3, tag: ["breakfast"] },
    { id: "r6", title: "Buttermilk Pancakes", source: "kingarthurbaking.com", prep: 10, cook: 15, total: 25, serves: 4, rating: 5, tag: ["breakfast", "weekend"] },
    { id: "r7", title: "Caesar Salad", source: "bonappetit.com", prep: 15, cook: 0, total: 15, serves: 4, rating: 4, tag: ["salad"] },
    { id: "r8", title: "Grilled Cheese", source: "—", prep: 2, cook: 6, total: 8, serves: 1, rating: 3, tag: ["lunch"] },
  ] as Recipe[],

  mealPlan: {
    weekOf: "April 20",
    rows: ["Breakfast", "Lunch", "Dinner", "Snack"],
    grid: [
      [null, "r5", null, "r5", null, "r6", null],
      ["r7", null, "r8", null, "r7", null, "r2"],
      ["r1", "r2", "r3", "r3", "r2", null, "r4"],
      [null, null, null, null, null, null, null],
    ],
  } as MealPlan,

  shopping: {
    weekOf: "April 20",
    fromRecipes: 8,
    categories: [
      {
        name: "Produce",
        items: [
          { amt: "1 lb", name: "Roma tomatoes", done: false },
          { amt: "2 bunches", name: "Italian parsley", done: false },
          { amt: "1", name: "yellow onion", done: true },
          { amt: "4", name: "bell peppers", done: false },
          { amt: "1 head", name: "romaine lettuce", done: false },
          { amt: "2", name: "limes", done: false },
        ],
      },
      {
        name: "Dairy",
        items: [
          { amt: "8 oz", name: "Pecorino Romano", done: false },
          { amt: "1 dozen", name: "eggs", done: true },
          { amt: "1 qt", name: "whole milk", done: false },
          { amt: "1 cup", name: "buttermilk", done: false },
        ],
      },
      {
        name: "Meat",
        items: [
          { amt: "6 oz", name: "guanciale", done: false },
          { amt: "1.5 lb", name: "chicken thighs", done: false },
          { amt: "1 lb", name: "ground turkey", done: false },
          { amt: "4 fillets", name: "salmon", done: false },
        ],
      },
      {
        name: "Pantry",
        items: [
          { amt: "1 lb", name: "spaghetti", done: true },
          { amt: "1 can", name: "kidney beans", done: false },
          { amt: "1 jar", name: "white miso", done: false },
        ],
      },
      {
        name: "Pantry Staples",
        pantry: true,
        items: [
          { amt: "", name: "olive oil", done: false },
          { amt: "", name: "kosher salt", done: false },
          { amt: "", name: "black pepper", done: false },
        ],
      },
    ],
  } as Shopping,

  equity: {
    period: "This Week",
    domains: 12,
    adults: [
      { id: "mom", total: 18, cognitive: 12, physical: 6, personalHrs: 2, personalGoal: 5, load: "yellow", loadPct: 58 },
      { id: "dad", total: 14, cognitive: 5, physical: 9, personalHrs: 6, personalGoal: 5, load: "green", loadPct: 42 },
    ],
    domainList: [
      { name: "Meals & Groceries", owner: "mom", hours: 5.5, tasks: 14 },
      { name: "Medical & Health", owner: "mom", hours: 2.0, tasks: 4 },
      { name: "School & Activities", owner: "mom", hours: 3.5, tasks: 9 },
      { name: "Birthdays & Gifts", owner: "mom", hours: 1.0, tasks: 2 },
      { name: "Household Supplies", owner: "mom", hours: 2.0, tasks: 6 },
      { name: "Social Planning", owner: "mom", hours: 2.0, tasks: 3 },
      { name: "Laundry", owner: "mom", hours: 2.0, tasks: 3 },
      { name: "Lawn & Garden", owner: "dad", hours: 3.0, tasks: 2 },
      { name: "Cars & Maintenance", owner: "dad", hours: 2.0, tasks: 1 },
      { name: "Trash & Recycling", owner: "dad", hours: 1.5, tasks: 4 },
      { name: "Finances & Bills", owner: "dad", hours: 4.0, tasks: 5 },
      { name: "Tech & Devices", owner: "dad", hours: 3.5, tasks: 3 },
    ],
    trend: [
      { w: "W-3", mom: 24, dad: 11 },
      { w: "W-2", mom: 22, dad: 13 },
      { w: "W-1", mom: 20, dad: 13 },
      { w: "This", mom: 18, dad: 14 },
    ],
  } as Equity,

  lists: [
    {
      id: "l1",
      title: "Packing for Weekend Trip",
      category: "packing" as const,
      emoji: "🎒",
      items: [
        { id: "li1", text: "Pack swimsuits & towels", done: true, assignee: "mom" },
        { id: "li2", text: "Charge portable battery", done: true, assignee: "dad" },
        { id: "li3", text: "Pack Jackson's soccer ball", done: false, assignee: "jackson" },
        { id: "li4", text: "Pack Emma's art supplies", done: false, assignee: "emma" },
        { id: "li5", text: "Grab sunscreen & bug spray", done: false, assignee: "mom", due: "2026-04-25" },
        { id: "li6", text: "Print reservation confirmation", done: false, assignee: "dad", due: "2026-04-25" },
      ],
    },
    {
      id: "l2",
      title: "Saturday Chores",
      category: "chores" as const,
      emoji: "🧹",
      items: [
        { id: "li7", text: "Vacuum living room & stairs", done: true, assignee: "jackson" },
        { id: "li8", text: "Clean bathrooms", done: false, assignee: "mom" },
        { id: "li9", text: "Take out trash & recycling", done: false, assignee: "dad" },
        { id: "li10", text: "Mow the lawn", done: false, assignee: "dad" },
        { id: "li11", text: "Wipe kitchen counters", done: false, assignee: "emma" },
      ],
    },
    {
      id: "l3",
      title: "Weekly Errands",
      category: "errands" as const,
      emoji: "🚗",
      items: [
        { id: "li12", text: "Pick up dry cleaning", done: false, assignee: "mom", due: "2026-04-24" },
        { id: "li13", text: "Drop off library books", done: false, assignee: "dad" },
        { id: "li14", text: "Get car oil changed", done: false, assignee: "dad", due: "2026-04-26" },
        { id: "li15", text: "Buy birthday card for Grandma", done: false, assignee: "mom", due: "2026-04-23" },
      ],
    },
  ] as FamilyList[],

  race: {
    name: "Kitchen Clean-Up Race!",
    countdownSec: 410,
    totalSec: 600,
    participants: [
      { id: "jackson", progress: 3, items: 5 },
      { id: "emma", progress: 4, items: 5 },
    ],
    items: [
      { name: "Clear table", by: "emma" },
      { name: "Rinse dishes", by: "jackson" },
      { name: "Load dishwasher", by: "emma" },
      { name: "Wipe counters", by: "jackson" },
      { name: "Sweep floor", by: null },
      { name: "Take out trash", by: "emma" },
      { name: "Wipe stovetop", by: "jackson" },
    ],
  } as Race,
};

export const getMember = (id: string): Member =>
  TBD.members.find((m) => m.id === id)!;

export const getMembers = (ids: string[]): Member[] =>
  ids.map(getMember).filter(Boolean);

export const fmtTime = (hm: string): string => {
  const [h, m] = hm.split(":").map(Number);
  const ap = h >= 12 ? "PM" : "AM";
  const h12 = ((h + 11) % 12) + 1;
  return `${h12}:${m.toString().padStart(2, "0")} ${ap}`;
};

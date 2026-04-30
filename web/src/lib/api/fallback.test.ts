import { describe, it, expect } from "vitest";
import { fallback, isApiFallbackMode } from "./fallback";

describe("isApiFallbackMode", () => {
  it("returns false when NEXT_PUBLIC_API_URL is the default", () => {
    // In test env the env var is undefined, which defaults to localhost:8080
    // so fallback mode is off
    expect(isApiFallbackMode()).toBe(false);
  });
});

describe("fallback.events", () => {
  it("returns array of events", () => {
    const events = fallback.events();
    expect(Array.isArray(events)).toBe(true);
    expect(events.length).toBeGreaterThan(0);
    expect(events[0]).toHaveProperty("id");
    expect(events[0]).toHaveProperty("title");
  });
});

describe("fallback.members", () => {
  it("returns 4 members", () => {
    const members = fallback.members();
    expect(members).toHaveLength(4);
    expect(members[0]).toHaveProperty("id");
    expect(members[0]).toHaveProperty("name");
  });
});

describe("fallback.recipes", () => {
  it("returns non-empty recipe list", () => {
    const recipes = fallback.recipes();
    expect(recipes.length).toBeGreaterThan(0);
    expect(recipes[0]).toHaveProperty("id");
    expect(recipes[0]).toHaveProperty("title");
  });
});

describe("fallback.recipe", () => {
  it("finds existing recipe by id", () => {
    const r = fallback.recipe("r1");
    expect(r).toBeDefined();
    expect(r?.id).toBe("r1");
  });

  it("returns undefined for unknown id", () => {
    expect(fallback.recipe("nonexistent")).toBeUndefined();
  });
});

describe("fallback.lists", () => {
  it("returns empty array when not in fallback mode", () => {
    // isApiFallbackMode() is false in test env; fixture data must not leak
    const lists = fallback.lists();
    expect(Array.isArray(lists)).toBe(true);
    expect(lists).toHaveLength(0);
  });
});

describe("fallback.list", () => {
  it("finds existing list by id", () => {
    const l = fallback.list("l1");
    expect(l).toBeDefined();
    expect(l?.id).toBe("l1");
  });

  it("returns undefined for unknown id", () => {
    expect(fallback.list("l999")).toBeUndefined();
  });
});

describe("fallback.shopping", () => {
  it("returns empty shopping object when not in fallback mode", () => {
    // isApiFallbackMode() is false in test env; fixture data must not leak
    const s = fallback.shopping();
    expect(s).toHaveProperty("categories");
    expect(s).toHaveProperty("weekOf");
    expect(s).toHaveProperty("fromRecipes");
    expect(s.categories).toHaveLength(0);
  });
});

describe("fallback.routines", () => {
  it("returns array with at least one routine in ApiRoutine shape", () => {
    const routines = fallback.routines();
    expect(Array.isArray(routines)).toBe(true);
    expect(routines.length).toBeGreaterThan(0);
    const r = routines[0] as unknown as Record<string, unknown>;
    // Must use the ApiRoutine shape (member_id, steps with est_minutes/icon).
    // The legacy `member` object on data.ts/Routine does not exist anymore —
    // the screens consume the API shape and would crash otherwise.
    expect(r).toHaveProperty("member_id");
    expect(r).toHaveProperty("steps");
    const steps = r.steps as Array<Record<string, unknown>>;
    expect(steps.length).toBeGreaterThan(0);
    expect(steps[0]).toHaveProperty("est_minutes");
    expect(steps[0]).toHaveProperty("icon");
  });
});

describe("fallback.equity", () => {
  it("returns equity with adults and domains", () => {
    const equity = fallback.equity();
    expect(equity).toHaveProperty("adults");
    expect(equity).toHaveProperty("domainList");
    expect(equity.adults.length).toBeGreaterThan(0);
  });
});

describe("fallback.mealPlan", () => {
  it("returns meal plan with weekOf and grid", () => {
    const mp = fallback.mealPlan();
    expect(mp).toHaveProperty("weekOf");
    expect(mp).toHaveProperty("rows");
    expect(mp).toHaveProperty("grid");
    expect(Array.isArray(mp.rows)).toBe(true);
    expect(Array.isArray(mp.grid)).toBe(true);
  });
});

describe("fallback.race", () => {
  it("returns race with name and participants", () => {
    const race = fallback.race();
    expect(race).toHaveProperty("name");
    expect(race).toHaveProperty("participants");
    expect(race).toHaveProperty("items");
    expect(Array.isArray(race.participants)).toBe(true);
  });
});

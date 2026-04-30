import { afterEach, describe, it, expect, vi } from "vitest";
import { fallback, isApiFallbackMode } from "./fallback";

describe("isApiFallbackMode", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("returns false when NEXT_PUBLIC_API_URL is the default", () => {
    // In test env the env var is undefined, which defaults to localhost:8080
    // so fallback mode is off
    expect(isApiFallbackMode()).toBe(false);
  });

  it("does not enable fallback only because NEXT_PUBLIC_API_URL is empty", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "");
    vi.resetModules();

    const mod = await import("./fallback");

    expect(mod.isApiFallbackMode()).toBe(false);
  });

  it("does not enable fallback even when a stale demo flag is set", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "");
    vi.stubEnv("NEXT_PUBLIC_TIDYBOARD_DEMO_MODE", "true");
    vi.resetModules();

    const mod = await import("./fallback");

    expect(mod.isApiFallbackMode()).toBe(false);
  });
});

describe("fallback.events", () => {
  it("returns an empty array", () => {
    const events = fallback.events();
    expect(Array.isArray(events)).toBe(true);
    expect(events).toHaveLength(0);
  });
});

describe("fallback.members", () => {
  it("returns an empty array", () => {
    const members = fallback.members();
    expect(members).toHaveLength(0);
  });
});

describe("fallback.recipes", () => {
  it("returns an empty recipe list", () => {
    const recipes = fallback.recipes();
    expect(recipes).toHaveLength(0);
  });
});

describe("fallback.recipe", () => {
  it("does not return sample recipes by id", () => {
    const r = fallback.recipe("r1");
    expect(r).toBeUndefined();
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
  it("does not return sample lists by id", () => {
    const l = fallback.list("l1");
    expect(l).toBeUndefined();
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
  it("returns an empty array", () => {
    const routines = fallback.routines();
    expect(Array.isArray(routines)).toBe(true);
    expect(routines).toHaveLength(0);
  });
});

describe("fallback.equity", () => {
  it("returns empty equity", () => {
    const equity = fallback.equity();
    expect(equity).toHaveProperty("adults");
    expect(equity).toHaveProperty("domainList");
    expect(equity.adults).toHaveLength(0);
    expect(equity.domainList).toHaveLength(0);
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
  it("returns an empty race", () => {
    const race = fallback.race();
    expect(race).toHaveProperty("name");
    expect(race).toHaveProperty("participants");
    expect(race).toHaveProperty("items");
    expect(race.participants).toHaveLength(0);
    expect(race.items).toHaveLength(0);
  });
});

import { describe, it, expect } from "vitest";
import {
  TBD,
  getMember,
  getMembers,
  fmtTime,
  type Member,
  type TBDEvent,
  type Routine,
  type Recipe,
} from "./data";

describe("TBD data shape", () => {
  it("has household name", () => {
    expect(TBD.household.name).toBe("The Smith Family");
  });

  it("has 4 members", () => {
    expect(TBD.members).toHaveLength(4);
  });

  it("each member has required fields", () => {
    for (const m of TBD.members) {
      expect(m).toHaveProperty("id");
      expect(m).toHaveProperty("name");
      expect(m).toHaveProperty("full");
      expect(m).toHaveProperty("color");
      expect(m).toHaveProperty("initial");
      expect(m).toHaveProperty("stars");
      expect(m).toHaveProperty("streak");
      expect(["adult", "child"]).toContain(m.role);
    }
  });

  it("has events array", () => {
    expect(TBD.events.length).toBeGreaterThan(0);
    const e = TBD.events[0] as TBDEvent;
    expect(e).toHaveProperty("id");
    expect(e).toHaveProperty("title");
    expect(e).toHaveProperty("start");
    expect(e).toHaveProperty("end");
    expect(Array.isArray(e.members)).toBe(true);
  });

  it("has week data with 7 days", () => {
    expect(TBD.week).toHaveLength(7);
  });

  it("routine has steps", () => {
    const r = TBD.routine as Routine;
    expect(r.steps.length).toBeGreaterThan(0);
    expect(r.member).toBe("jackson");
  });

  it("recipes array is non-empty", () => {
    expect(TBD.recipes.length).toBeGreaterThan(0);
    const r = TBD.recipes[0] as Recipe;
    expect(r).toHaveProperty("id");
    expect(r).toHaveProperty("title");
    expect(r).toHaveProperty("rating");
    expect(Array.isArray(r.tag)).toBe(true);
  });

  it("shopping has categories", () => {
    expect(TBD.shopping.categories.length).toBeGreaterThan(0);
  });

  it("equity has adults", () => {
    expect(TBD.equity.adults.length).toBeGreaterThan(0);
    expect(TBD.equity.domainList.length).toBeGreaterThan(0);
    expect(TBD.equity.trend.length).toBeGreaterThan(0);
  });

  it("race has participants and items", () => {
    expect(TBD.race.participants.length).toBeGreaterThan(0);
    expect(TBD.race.items.length).toBeGreaterThan(0);
  });
});

describe("getMember", () => {
  it("returns dad by id", () => {
    const m = getMember("dad");
    expect(m.id).toBe("dad");
    expect(m.name).toBe("Dad");
    expect(m.role).toBe("adult");
  });

  it("returns mom by id", () => {
    const m = getMember("mom");
    expect(m.id).toBe("mom");
    expect(m.color).toBe("#EF4444");
  });

  it("returns jackson by id", () => {
    const m = getMember("jackson");
    expect(m.role).toBe("child");
    expect(m.stars).toBeGreaterThanOrEqual(0);
  });

  it("returns emma by id", () => {
    const m = getMember("emma");
    expect(m.initial).toBe("E");
  });
});

describe("getMembers", () => {
  it("returns multiple members in order", () => {
    const ms = getMembers(["dad", "mom"]);
    expect(ms).toHaveLength(2);
    expect(ms[0].id).toBe("dad");
    expect(ms[1].id).toBe("mom");
  });

  it("returns empty array for empty input", () => {
    expect(getMembers([])).toEqual([]);
  });

  it("filters out unknown ids", () => {
    const ms = getMembers(["dad", "unknown"]);
    expect(ms).toHaveLength(1);
    expect(ms[0].id).toBe("dad");
  });
});

describe("fmtTime", () => {
  it("formats midnight as 12:00 AM", () => {
    expect(fmtTime("00:00")).toBe("12:00 AM");
  });

  it("formats noon as 12:00 PM", () => {
    expect(fmtTime("12:00")).toBe("12:00 PM");
  });

  it("formats 8:00 AM correctly", () => {
    expect(fmtTime("08:00")).toBe("8:00 AM");
  });

  it("formats 8:30 AM correctly", () => {
    expect(fmtTime("08:30")).toBe("8:30 AM");
  });

  it("formats 17:45 as 5:45 PM", () => {
    expect(fmtTime("17:45")).toBe("5:45 PM");
  });

  it("formats 15:30 as 3:30 PM", () => {
    expect(fmtTime("15:30")).toBe("3:30 PM");
  });

  it("formats 20:00 as 8:00 PM", () => {
    expect(fmtTime("20:00")).toBe("8:00 PM");
  });

  it("pads single-digit minutes", () => {
    expect(fmtTime("09:05")).toBe("9:05 AM");
  });
});

/**
 * Vitest covering the contract from spec section B.3:
 *
 * 1. UUIDs match the Go seed package byte-for-byte (cross-language
 *    fixtures must use identical IDs).
 * 2. Events have `assigned_members` populated and `members` is
 *    undefined — this is the regression-class trap. A consumer that
 *    direct-reads `event.members` will get undefined, surfacing the
 *    type-widening bug at PR-CI time.
 * 3. recipe_ingredients and recipe_steps are always arrays (never
 *    undefined), matching the #109 serialization fix.
 *
 * Spec: docs/specs/2026-05-01-flintstones-design.md, section B.3.
 */

import { describe, it, expect } from "vitest";

import {
  BAMM_BAMM_ID,
  BARNEY_ID,
  BETTY_ID,
  DINO_ID,
  FLINTSTONE_HOUSEHOLD_ID,
  FRED_ID,
  HOPPY_ID,
  PEBBLES_ID,
  RUBBLE_HOUSEHOLD_ID,
  WILMA_ID,
  flintstoneBirthdayEvent,
  flintstoneBowlingEvent,
  flintstoneBrontoRecipe,
  flintstoneCountdownEvent,
  flintstones,
  rubbles,
} from "./flintstones";

describe("Flintstones fixture — UUIDs match the Go seed package", () => {
  it("Flintstones household + member IDs are the canonical SHA-1(OID,name) values", () => {
    expect(FLINTSTONE_HOUSEHOLD_ID).toBe("1d7515c6-2bae-5d07-951a-3cc6d2995e02");
    expect(FRED_ID).toBe("5bd9753c-67d6-544a-84aa-caffd7bdeb58");
    expect(WILMA_ID).toBe("30b09690-0d54-5b9f-9772-97d45baf0d4d");
    expect(PEBBLES_ID).toBe("83184747-32c0-5857-b783-e84513513100");
    expect(DINO_ID).toBe("0069ffc4-a6ea-5a04-bbc4-2dbeb293b92b");
  });

  it("Rubbles household + member IDs are the canonical SHA-1(OID,name) values", () => {
    expect(RUBBLE_HOUSEHOLD_ID).toBe("2652058f-e5ca-5c9f-9e55-599fa484dca9");
    expect(BARNEY_ID).toBe("fbe0b777-3de4-540d-8512-f12774cee81d");
    expect(BETTY_ID).toBe("8dcc8934-ed2b-51a0-bd3f-d323f4d27fbe");
    expect(BAMM_BAMM_ID).toBe("7be75ecc-51e5-59c3-b3ee-10e68dd18fd9");
    expect(HOPPY_ID).toBe("87d91cb1-9e97-50bd-9e71-2e368ce715e1");
  });

  it("each household has exactly four members and they're attached to the right household", () => {
    expect(flintstones.members).toHaveLength(4);
    expect(rubbles.members).toHaveLength(4);
    flintstones.members.forEach((m) => expect(m.household_id).toBe(FLINTSTONE_HOUSEHOLD_ID));
    rubbles.members.forEach((m) => expect(m.household_id).toBe(RUBBLE_HOUSEHOLD_ID));
  });
});

describe("Flintstones fixture — events mirror the live API shape", () => {
  it("every event has assigned_members populated", () => {
    for (const event of [flintstoneBowlingEvent, flintstoneBirthdayEvent, flintstoneCountdownEvent]) {
      expect(Array.isArray(event.assigned_members)).toBe(true);
      expect(event.assigned_members.length).toBeGreaterThan(0);
    }
  });

  it("events have NO `members` field — consumers must read `assigned_members`", () => {
    // This is the regression-class trap from spec section B.3. If a future
    // consumer regresses to `event.members`, it will be undefined and any
    // direct dereference (e.g. `event.members.length`) will throw.
    for (const event of [flintstoneBowlingEvent, flintstoneBirthdayEvent, flintstoneCountdownEvent]) {
      expect((event as Record<string, unknown>).members).toBeUndefined();
    }
  });

  it("Bedrock Bowling Night assigns Fred + Wilma exactly", () => {
    expect(flintstoneBowlingEvent.assigned_members).toEqual([FRED_ID, WILMA_ID]);
  });
});

describe("Flintstones fixture — recipes serialize ingredients + steps as arrays", () => {
  it("recipe_ingredients is an array (4 ingredients, never undefined)", () => {
    expect(Array.isArray(flintstoneBrontoRecipe.recipe_ingredients)).toBe(true);
    expect(flintstoneBrontoRecipe.recipe_ingredients).toHaveLength(4);
  });

  it("recipe_steps is an array (3 steps, never undefined)", () => {
    expect(Array.isArray(flintstoneBrontoRecipe.recipe_steps)).toBe(true);
    expect(flintstoneBrontoRecipe.recipe_steps).toHaveLength(3);
  });

  it("ingredient sort_order is monotonically increasing from 0", () => {
    flintstoneBrontoRecipe.recipe_ingredients.forEach((ing, i) => {
      expect(ing.sort_order).toBe(i);
    });
  });
});

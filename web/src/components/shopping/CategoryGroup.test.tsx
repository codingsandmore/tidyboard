import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { ShoppingCategory } from "@/lib/data";
import {
  groupShopping,
  GroupModeToggle,
  RECIPE_GROUP_OTHER,
  RECIPE_GROUP_PANTRY,
  MANUAL_GROUP_NAME,
} from "./CategoryGroup";

const fixture: ShoppingCategory[] = [
  {
    name: "Produce",
    items: [
      { id: "i1", amt: "2", name: "tomatoes", done: false, sourceRecipes: ["Spaghetti"] },
      { id: "i2", amt: "1 head", name: "lettuce", done: false, sourceRecipes: ["Tacos"] },
    ],
  },
  {
    name: "Meat",
    items: [
      { id: "i3", amt: "1 lb", name: "beef", done: false, sourceRecipes: ["Spaghetti", "Tacos"] },
    ],
  },
  {
    name: "Pantry Staples",
    pantry: true,
    items: [
      { id: "i4", amt: "", name: "olive oil", done: false, sourceRecipes: ["pantry staple"] },
    ],
  },
];

describe("groupShopping", () => {
  it("aisle mode passes categories through unchanged", () => {
    const out = groupShopping(fixture, "aisle");
    expect(out.categories.map((c) => c.name)).toEqual(["Produce", "Meat", "Pantry Staples"]);
    // does not mutate the input
    expect(out.categories).not.toBe(fixture);
    expect(out.categories[0]).not.toBe(fixture[0]);
  });

  it("manual mode flattens into a single bucket preserving order", () => {
    const out = groupShopping(fixture, "manual");
    expect(out.categories).toHaveLength(1);
    expect(out.categories[0].name).toBe(MANUAL_GROUP_NAME);
    expect(out.categories[0].items.map((i) => i.name)).toEqual([
      "tomatoes",
      "lettuce",
      "beef",
      "olive oil",
    ]);
  });

  it("manual mode returns empty array for empty input (no zero-item bucket)", () => {
    expect(groupShopping([], "manual").categories).toEqual([]);
  });

  it("recipe mode groups items under each contributing recipe", () => {
    const out = groupShopping(fixture, "recipe");
    const names = out.categories.map((c) => c.name);
    expect(names).toContain("Spaghetti");
    expect(names).toContain("Tacos");
    expect(names).toContain(RECIPE_GROUP_PANTRY);

    const spaghetti = out.categories.find((c) => c.name === "Spaghetti")!;
    expect(spaghetti.items.map((i) => i.name)).toEqual(
      expect.arrayContaining(["tomatoes", "beef"])
    );

    const tacos = out.categories.find((c) => c.name === "Tacos")!;
    expect(tacos.items.map((i) => i.name)).toEqual(
      expect.arrayContaining(["lettuce", "beef"])
    );
  });

  it("recipe mode routes pantry-flagged categories into the pantry bucket", () => {
    const out = groupShopping(fixture, "recipe");
    const pantry = out.categories.find((c) => c.name === RECIPE_GROUP_PANTRY)!;
    expect(pantry.items.map((i) => i.name)).toEqual(["olive oil"]);
    expect(pantry.pantry).toBe(true);
  });

  it("recipe mode buckets recipe-less items as Other", () => {
    const out = groupShopping(
      [
        {
          name: "Misc",
          items: [
            { id: "x", amt: "1", name: "salt", done: false, sourceRecipes: [] },
            { id: "y", amt: "1", name: "sugar", done: false, sourceRecipes: undefined },
          ],
        },
      ],
      "recipe"
    );
    const other = out.categories.find((c) => c.name === RECIPE_GROUP_OTHER)!;
    expect(other.items.map((i) => i.name)).toEqual(["salt", "sugar"]);
  });

  it("recipe mode item shared by two recipes appears under both", () => {
    const beefSpaghetti = groupShopping(fixture, "recipe").categories.find(
      (c) => c.name === "Spaghetti"
    )!;
    const beefTacos = groupShopping(fixture, "recipe").categories.find(
      (c) => c.name === "Tacos"
    )!;
    expect(beefSpaghetti.items.find((i) => i.name === "beef")).toBeTruthy();
    expect(beefTacos.items.find((i) => i.name === "beef")).toBeTruthy();
  });

  it("recipe mode treats 'pantry staple' source as pantry even without category flag", () => {
    const out = groupShopping(
      [
        {
          name: "Other",
          items: [{ id: "z", amt: "", name: "salt", done: false, sourceRecipes: ["pantry staple"] }],
        },
      ],
      "recipe"
    );
    expect(out.categories.find((c) => c.name === RECIPE_GROUP_PANTRY)?.items[0].name).toBe(
      "salt"
    );
  });
});

describe("GroupModeToggle", () => {
  it("renders all three modes", () => {
    render(<GroupModeToggle value="aisle" onChange={() => {}} />);
    expect(screen.getByTestId("group-by-aisle")).toBeTruthy();
    expect(screen.getByTestId("group-by-recipe")).toBeTruthy();
    expect(screen.getByTestId("group-by-manual")).toBeTruthy();
  });

  it("marks the active mode with aria-checked", () => {
    render(<GroupModeToggle value="recipe" onChange={() => {}} />);
    expect(screen.getByTestId("group-by-recipe").getAttribute("aria-checked")).toBe("true");
    expect(screen.getByTestId("group-by-aisle").getAttribute("aria-checked")).toBe("false");
  });

  it("invokes onChange with the clicked mode", () => {
    const onChange = vi.fn();
    render(<GroupModeToggle value="aisle" onChange={onChange} />);
    fireEvent.click(screen.getByTestId("group-by-recipe"));
    expect(onChange).toHaveBeenCalledWith("recipe");
  });
});

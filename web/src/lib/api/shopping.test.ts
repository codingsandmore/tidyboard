import { describe, expect, it } from "vitest";
import { apiShoppingListToShopping } from "./shopping";

describe("apiShoppingListToShopping", () => {
  it("groups flat backend shopping items by aisle and preserves source recipe labels", () => {
    const shopping = apiShoppingListToShopping({
      id: "list-1",
      household_id: "hh-1",
      name: "Shopping 2026-04-27 - 2026-05-03",
      date_from: "2026-04-27",
      date_to: "2026-05-03",
      is_active: true,
      created_at: "2026-04-27T00:00:00Z",
      updated_at: "2026-04-27T00:00:00Z",
      items: [
        {
          id: "item-1",
          shopping_list_id: "list-1",
          name: "tomatoes",
          amount: 4,
          unit: "each",
          aisle: "produce",
          source_recipes: ["Tacos"],
          completed: false,
          sort_order: 0,
        },
        {
          id: "item-2",
          shopping_list_id: "list-1",
          name: "olive oil",
          amount: 0,
          unit: "",
          aisle: "pantry staples",
          source_recipes: ["pantry staple"],
          completed: true,
          sort_order: 1,
        },
      ],
    });

    expect(shopping.weekOf).toBe("2026-04-27");
    expect(shopping.fromRecipes).toBe(1);
    expect(shopping.categories.map((category) => category.name)).toEqual(["Produce", "Pantry Staples"]);
    expect(shopping.categories[0].items[0]).toMatchObject({
      id: "item-1",
      amt: "4 each",
      name: "tomatoes",
      done: false,
      sourceRecipes: ["Tacos"],
    });
    expect(shopping.categories[1].pantry).toBe(true);
  });
});

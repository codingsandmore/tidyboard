import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { MealPlan, Recipe, Shopping } from "@/lib/data";

const recipes: Recipe[] = [
  {
    id: "rec-1",
    title: "Bronto burgers",
    source: "family",
    prep: 10,
    cook: 20,
    total: 30,
    serves: 4,
    rating: 5,
    tag: ["dinner"],
  },
];

const mealPlan: MealPlan = {
  weekOf: "2026-01-05",
  rows: ["Breakfast", "Lunch", "Dinner", "Snack"],
  grid: [
    [null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null],
    ["rec-1", null, null, null, null, null, null],
    [null, null, null, null, null, null, null],
  ],
};

const shopping: Shopping = {
  weekOf: "2026-01-05",
  fromRecipes: 1,
  categories: [
    {
      name: "Produce",
      items: [{ id: "i-1", name: "Onions", amt: "2", done: false }],
    },
  ],
};

vi.mock("@/lib/api/hooks", () => ({
  useLiveMealPlan: () => ({ data: mealPlan }),
  useLiveRecipes: () => ({ data: recipes }),
  useShopping: () => ({ data: shopping }),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import KioskMealsPage from "./page";

describe("/kiosk/meals page", () => {
  it("renders the Meals heading with active tab and widgets", () => {
    render(<KioskMealsPage />);
    expect(screen.getByRole("heading", { name: "Meals & shopping" })).toBeTruthy();
    expect(
      screen.getByTestId("kiosk-tab-meals").getAttribute("aria-current")
    ).toBe("page");
    expect(screen.getByTestId("kiosk-meals")).toBeTruthy();
    expect(screen.getByTestId("kiosk-shopping")).toBeTruthy();
  });

  it("shows the dinner plan and an open shopping item", () => {
    render(<KioskMealsPage />);
    expect(screen.getByText("Bronto burgers")).toBeTruthy();
    expect(screen.getByText("Onions")).toBeTruthy();
  });
});

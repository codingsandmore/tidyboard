import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { Shopping } from "@/lib/data";

const shopping: Shopping = {
  weekOf: "2026-04-30",
  fromRecipes: 0,
  categories: [
    {
      name: "Produce",
      items: [
        { id: "apples", name: "Apples", amt: "6", done: false },
        { id: "carrots", name: "Carrots", amt: "1 lb", done: true },
      ],
    },
    {
      name: "Dairy",
      items: [{ id: "milk", name: "Milk", amt: "1 gal", done: false }],
    },
  ],
};

vi.mock("@/lib/api/hooks", () => ({
  useShopping: () => ({ data: shopping }),
}));

import CompanionShoppingPage from "./page";

describe("/companion/shopping", () => {
  it("renders the shopping heading and active tab", () => {
    render(<CompanionShoppingPage />);
    expect(screen.getByRole("heading", { name: "Shopping" })).toBeTruthy();
    expect(
      screen.getByTestId("companion-tab-shopping").getAttribute("aria-current")
    ).toBe("page");
  });

  it("shows outstanding items in the open list", () => {
    render(<CompanionShoppingPage />);
    expect(screen.getByTestId("companion-shopping-item-apples")).toBeTruthy();
    expect(screen.getByTestId("companion-shopping-item-milk")).toBeTruthy();
  });

  it("shows done items collapsed in a details summary", () => {
    render(<CompanionShoppingPage />);
    const done = screen.getByTestId("companion-shopping-done");
    expect(done).toBeTruthy();
    // Carrots is done → not in open list
    expect(screen.queryByTestId("companion-shopping-item-carrots")).toBeNull();
    expect(screen.getByText("Carrots")).toBeTruthy();
  });
});

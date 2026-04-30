import type { Shopping, ShoppingCategory, ShoppingItem } from "@/lib/data";

export interface ApiShoppingListItem {
  id: string;
  shopping_list_id: string;
  name: string;
  amount: number;
  unit: string;
  aisle: string;
  source_recipes: string[];
  completed: boolean;
  sort_order: number;
}

export interface ApiShoppingList {
  id: string;
  household_id: string;
  name: string;
  date_from: string;
  date_to: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  items?: ApiShoppingListItem[];
}

function titleCase(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function formatAmount(amount: number, unit: string): string {
  if (!amount) return "";
  const amountText = Number.isInteger(amount) ? String(amount) : String(Number(amount.toFixed(2)));
  return unit ? `${amountText} ${unit}` : amountText;
}

export function apiShoppingListItemToShoppingItem(item: ApiShoppingListItem): ShoppingItem {
  return {
    id: item.id,
    amt: formatAmount(item.amount, item.unit),
    name: item.name,
    done: item.completed,
    sourceRecipes: item.source_recipes ?? [],
  };
}

export function apiShoppingListToShopping(list: ApiShoppingList): Shopping {
  const categories: ShoppingCategory[] = [];
  const categoryByName = new Map<string, ShoppingCategory>();
  const recipeNames = new Set<string>();

  for (const item of [...(list.items ?? [])].sort((a, b) => a.sort_order - b.sort_order)) {
    const aisle = item.aisle?.trim() || "other";
    const categoryName = titleCase(aisle);
    let category = categoryByName.get(categoryName);
    if (!category) {
      category = {
        name: categoryName,
        pantry: aisle.toLowerCase().includes("pantry"),
        items: [],
      };
      categoryByName.set(categoryName, category);
      categories.push(category);
    }

    for (const source of item.source_recipes ?? []) {
      if (source !== "pantry staple") recipeNames.add(source);
    }

    category.items.push(apiShoppingListItemToShoppingItem(item));
  }

  return {
    weekOf: list.date_from,
    fromRecipes: recipeNames.size,
    categories,
  };
}

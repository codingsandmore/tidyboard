"use client";

/**
 * CategoryGroup — Cozyla-informed grocery list grouping (issue #86).
 *
 * Takes the server-shaped `ShoppingCategory[]` (aisle-grouped today) and
 * pivots it into one of three deterministic, AI-free groupings:
 *
 *   • "aisle"  — the server default; categories pass through unchanged.
 *   • "recipe" — items regrouped by their `sourceRecipes`. Items with no
 *                recipe land in an "Other" bucket; pantry staples land in
 *                "Pantry staples". Items shared by two recipes appear under
 *                each so the cook can scan one recipe at a time.
 *   • "manual" — single flat list preserving incoming order, suitable for
 *                Cozyla-style "no grouping" walking-order mode.
 *
 * Pure / deterministic / no-network / no-AI. Tested in isolation.
 */

import type { ShoppingCategory, ShoppingItem } from "@/lib/data";

export type GroupMode = "aisle" | "recipe" | "manual";

export interface CategoryGroupResult {
  /** Display-ready grouped categories. Each category has a stable name. */
  categories: ShoppingCategory[];
}

export const PANTRY_STAPLE_RECIPE_LABEL = "pantry staple";
export const RECIPE_GROUP_PANTRY = "Pantry staples";
export const RECIPE_GROUP_OTHER = "Other";
export const MANUAL_GROUP_NAME = "All items";

/**
 * Regroup `categories` into the requested `mode`. Inputs are not mutated.
 */
export function groupShopping(
  categories: ShoppingCategory[],
  mode: GroupMode
): CategoryGroupResult {
  if (mode === "aisle") {
    return { categories: categories.map((c) => ({ ...c, items: [...c.items] })) };
  }

  if (mode === "manual") {
    const items: ShoppingItem[] = [];
    for (const cat of categories) {
      for (const it of cat.items) items.push({ ...it });
    }
    return {
      categories: items.length === 0
        ? []
        : [{ name: MANUAL_GROUP_NAME, items }],
    };
  }

  // mode === "recipe"
  const buckets = new Map<string, ShoppingItem[]>();
  const order: string[] = [];

  for (const cat of categories) {
    for (const it of cat.items) {
      const sources = (it.sourceRecipes ?? []).filter(Boolean);
      const isPantry =
        cat.pantry === true ||
        sources.length === 0 && /pantry/i.test(cat.name) ||
        sources.some((s) => s.toLowerCase() === PANTRY_STAPLE_RECIPE_LABEL);

      if (isPantry) {
        push(buckets, order, RECIPE_GROUP_PANTRY, it);
        continue;
      }

      const recipeNames = sources.filter(
        (s) => s.toLowerCase() !== PANTRY_STAPLE_RECIPE_LABEL
      );

      if (recipeNames.length === 0) {
        push(buckets, order, RECIPE_GROUP_OTHER, it);
        continue;
      }

      for (const name of recipeNames) {
        push(buckets, order, name, it);
      }
    }
  }

  return {
    categories: order.map((name) => ({
      name,
      pantry: name === RECIPE_GROUP_PANTRY,
      items: buckets.get(name) ?? [],
    })),
  };
}

function push(
  buckets: Map<string, ShoppingItem[]>,
  order: string[],
  key: string,
  item: ShoppingItem
): void {
  if (!buckets.has(key)) {
    buckets.set(key, []);
    order.push(key);
  }
  buckets.get(key)!.push({ ...item });
}

// ─────────────────────────────────────────────────────────────────────────────
// Toolbar component (presentational only)
// ─────────────────────────────────────────────────────────────────────────────

import { TB } from "@/lib/tokens";

const MODES: { value: GroupMode; label: string }[] = [
  { value: "aisle", label: "By aisle" },
  { value: "recipe", label: "By recipe" },
  { value: "manual", label: "No grouping" },
];

export function GroupModeToggle({
  value,
  onChange,
}: {
  value: GroupMode;
  onChange: (mode: GroupMode) => void;
}) {
  return (
    <div
      data-testid="shopping-group-toggle"
      role="radiogroup"
      aria-label="Group shopping list by"
      style={{
        display: "inline-flex",
        gap: 4,
        padding: 4,
        background: TB.surface,
        border: `1px solid ${TB.border}`,
        borderRadius: 999,
      }}
    >
      {MODES.map((m) => {
        const active = value === m.value;
        return (
          <button
            key={m.value}
            type="button"
            role="radio"
            aria-checked={active}
            data-testid={`group-by-${m.value}`}
            onClick={() => onChange(m.value)}
            style={{
              padding: "6px 12px",
              borderRadius: 999,
              border: "none",
              cursor: "pointer",
              background: active ? TB.primary : "transparent",
              color: active ? "#fff" : TB.text2,
              fontSize: 12,
              fontWeight: 600,
              fontFamily: TB.fontBody,
            }}
          >
            {m.label}
          </button>
        );
      })}
    </div>
  );
}

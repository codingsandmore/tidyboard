"use client";

/**
 * /kiosk/meals — fixed Cozyla-style kiosk Meals & Shopping page (#83).
 */

import { KioskPageShell } from "@/components/kiosk/kiosk-page-shell";
import {
  MealStripWidget,
  ShoppingWidget,
} from "@/components/kiosk/widgets";
import {
  useLiveMealPlan,
  useLiveRecipes,
  useShopping,
} from "@/lib/api/hooks";

export default function KioskMealsPage() {
  const { data: mealPlan } = useLiveMealPlan();
  const { data: recipes } = useLiveRecipes();
  const { data: shopping } = useShopping();

  return (
    <KioskPageShell
      activeId="meals"
      heading="Meals & shopping"
      subheading="Tonight's dinner and what's on the list"
    >
      <MealStripWidget mealPlan={mealPlan} recipes={recipes ?? []} />
      <div style={{ minHeight: 0, flex: 1 }}>
        <ShoppingWidget shopping={shopping} />
      </div>
    </KioskPageShell>
  );
}

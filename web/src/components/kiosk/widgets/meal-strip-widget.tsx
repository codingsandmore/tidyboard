"use client";

import { TB } from "@/lib/tokens";
import type { MealPlan, Recipe } from "@/lib/data";
import { WidgetFrame, WidgetEmpty } from "./widget-frame";

/**
 * MealStripWidget — week-strip of dinners (or any single meal row) drawn
 * from the household meal plan. Used on /kiosk/meals.
 *
 * Reads the same canonical {@link MealPlan} shape as the dashboard so
 * rendering stays consistent across surfaces.
 */
export interface MealStripWidgetProps {
  mealPlan?: MealPlan;
  recipes: Recipe[];
  /** Which row to highlight; default "Dinner". Case-insensitive match. */
  rowName?: string;
  "data-testid"?: string;
}

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function MealStripWidget({
  mealPlan,
  recipes,
  rowName = "Dinner",
  ...rest
}: MealStripWidgetProps) {
  const testId = rest["data-testid"] ?? "kiosk-meals";
  if (!mealPlan) {
    return (
      <WidgetFrame data-testid={testId} eyebrow="This week" title="Meals">
        <WidgetEmpty
          message="No meal plan yet"
          hint="Plan meals from the recipes screen."
          testId={`${testId}-empty`}
        />
      </WidgetFrame>
    );
  }

  const rowIndex = mealPlan.rows.findIndex(
    (r) => r.toLowerCase() === rowName.toLowerCase()
  );
  if (rowIndex < 0) {
    return (
      <WidgetFrame data-testid={testId} eyebrow="This week" title={rowName}>
        <WidgetEmpty
          message={`No ${rowName.toLowerCase()} row in this meal plan`}
          testId={`${testId}-norow`}
        />
      </WidgetFrame>
    );
  }
  const row = mealPlan.grid[rowIndex] ?? [];
  const recipeById = new Map(recipes.map((r) => [r.id, r]));

  return (
    <WidgetFrame
      data-testid={testId}
      eyebrow="This week"
      title={`${rowName} plan`}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
          gap: 8,
        }}
      >
        {row.map((recipeId, dayIdx) => {
          const recipe = recipeId ? recipeById.get(recipeId) : null;
          return (
            <div
              key={dayIdx}
              data-testid={`kiosk-meals-day-${dayIdx}`}
              style={{
                background: recipe ? TB.bg2 : TB.surface,
                border: `1px solid ${TB.border}`,
                borderRadius: TB.r.lg,
                padding: 10,
                display: "flex",
                flexDirection: "column",
                gap: 6,
                minHeight: 92,
              }}
            >
              <div
                style={{
                  fontFamily: TB.fontMono,
                  fontSize: 11,
                  color: TB.text2,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                }}
              >
                {DAY_LABELS[dayIdx] ?? `Day ${dayIdx + 1}`}
              </div>
              {recipe ? (
                <>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: TB.text,
                      lineHeight: 1.2,
                    }}
                  >
                    {recipe.title}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: TB.text2,
                      fontFamily: TB.fontMono,
                    }}
                  >
                    {recipe.total} min · {recipe.serves}
                  </div>
                </>
              ) : (
                <div style={{ fontSize: 12, color: TB.muted }}>—</div>
              )}
            </div>
          );
        })}
      </div>
    </WidgetFrame>
  );
}

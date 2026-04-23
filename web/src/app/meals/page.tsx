import type { Metadata } from "next";
import { TB } from "@/lib/tokens";
import { MealPlan } from "@/components/screens/recipes";

export const metadata: Metadata = {
  title: "Meal Plan",
  description:
    "Plan your family's weekly meals, drag recipes onto the grid, and auto-generate a shopping list.",
};

export default function MealsPage() {
  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        background: TB.bg,
        fontFamily: TB.fontBody,
      }}
    >
      {/* Small header */}
      <div
        style={{
          padding: "8px 16px",
          background: TB.surface,
          borderBottom: `1px solid ${TB.border}`,
          display: "flex",
          alignItems: "center",
          gap: 10,
          fontSize: 13,
        }}
      >
        <a
          href="/"
          style={{
            color: TB.text2,
            textDecoration: "none",
            padding: "6px 10px",
            borderRadius: 6,
            border: `1px solid ${TB.border}`,
          }}
        >
          ← Home
        </a>
      </div>
      <div style={{ flex: 1, overflow: "hidden" }}>
        <MealPlan />
      </div>
    </div>
  );
}

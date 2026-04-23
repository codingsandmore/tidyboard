"use client";

import { TB } from "@/lib/tokens";
import { RecipeDetail } from "@/components/screens/recipes";
import { useTheme } from "@/components/theme-provider";
import type { Recipe } from "@/lib/data";

export function RecipeDetailThemed({ recipe }: { recipe: Recipe }) {
  const { theme } = useTheme();
  const dark = theme === "dark";

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        background: dark ? TB.dBg : TB.bg,
        fontFamily: TB.fontBody,
      }}
    >
      <RecipeDetail dark={dark} />
    </div>
  );
}

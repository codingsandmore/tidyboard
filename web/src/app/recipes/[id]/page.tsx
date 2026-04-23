import type { Metadata } from "next";
import Link from "next/link";
import { TB } from "@/lib/tokens";
import { TBD } from "@/lib/data";
import { RecipeDetailThemed } from "@/components/recipe-detail-themed";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const recipe = TBD.recipes.find((r) => r.id === id);
  if (!recipe) {
    return { title: "Recipe Not Found" };
  }
  return {
    title: recipe.title,
    description: `${recipe.title} — ${recipe.total} min total · serves ${recipe.serves}. From your Tidyboard recipe collection.`,
  };
}

export default async function RecipeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const recipe = TBD.recipes.find((r) => r.id === id);

  if (!recipe) {
    return (
      <div
        style={{
          width: "100vw",
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: TB.bg,
          fontFamily: TB.fontBody,
          color: TB.text2,
          gap: 16,
        }}
      >
        <div style={{ fontSize: 18 }}>Recipe not found</div>
        <Link
          href="/recipes"
          style={{
            color: TB.primary,
            textDecoration: "none",
            fontSize: 14,
          }}
        >
          ← Back to recipes
        </Link>
      </div>
    );
  }

  return <RecipeDetailThemed recipe={recipe} />;
}

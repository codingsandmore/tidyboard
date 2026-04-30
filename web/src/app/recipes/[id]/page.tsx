import type { Metadata } from "next";
import { TB } from "@/lib/tokens";
import { RecipeDetail } from "@/components/screens/recipes";

export const metadata: Metadata = {
  title: "Recipe",
  description: "Recipe details from your Tidyboard household account.",
};

export default async function RecipeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

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
      <RecipeDetail id={id} />
    </div>
  );
}

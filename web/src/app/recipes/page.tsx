import type { Metadata } from "next";
import { RecipesWithCollections } from "@/components/screens/recipes-with-collections";

export const metadata: Metadata = {
  title: "Recipes",
  description:
    "Your family recipe collection. Import from 630+ websites, scale servings, and enter cooking mode.",
};

export default function RecipesPage() {
  return <RecipesWithCollections />;
}

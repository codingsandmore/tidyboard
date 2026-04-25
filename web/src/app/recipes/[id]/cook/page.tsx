import type { Metadata } from "next";
import { CookingMode } from "@/components/screens/cooking-mode";

export const metadata: Metadata = {
  title: "Cooking Mode",
  description: "Step-by-step cooking mode — large text, wake lock, optional timers.",
};

export default async function CookPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CookingMode recipeId={id} />;
}

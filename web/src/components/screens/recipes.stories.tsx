import type { Meta, StoryObj } from "@storybook/react";
import { RecipeImport, RecipeDetail, RecipePreview, MealPlan, ShoppingList } from "./recipes";

const meta: Meta<typeof RecipeImport> = {
  title: "Screens/Recipes/Import",
  component: RecipeImport,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    viewport: { defaultViewport: "iphone14" },
    backgrounds: { default: "light" },
  },
};

export default meta;
type Story = StoryObj<typeof RecipeImport>;

export const Import: Story = {};

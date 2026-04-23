import type { Meta, StoryObj } from "@storybook/react";
import { MealPlan } from "./recipes";

const meta: Meta<typeof MealPlan> = {
  title: "Screens/Recipes/MealPlan",
  component: MealPlan,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    viewport: { defaultViewport: "ipad" },
    backgrounds: { default: "light" },
  },
};

export default meta;
type Story = StoryObj<typeof MealPlan>;

export const Plan: Story = {};

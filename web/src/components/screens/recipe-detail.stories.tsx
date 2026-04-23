import type { Meta, StoryObj } from "@storybook/react";
import { RecipeDetail } from "./recipes";

const meta: Meta<typeof RecipeDetail> = {
  title: "Screens/Recipes/Detail",
  component: RecipeDetail,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    viewport: { defaultViewport: "iphone14" },
    backgrounds: { default: "light" },
  },
};

export default meta;
type Story = StoryObj<typeof RecipeDetail>;

export const CarbonareLight: Story = {
  args: { id: "r1", dark: false },
};

export const CarbonareDark: Story = {
  args: { id: "r1", dark: true },
  parameters: { backgrounds: { default: "dark" } },
};

export const Fajitas: Story = {
  args: { id: "r2", dark: false },
};

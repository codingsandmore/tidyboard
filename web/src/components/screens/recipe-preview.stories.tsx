import type { Meta, StoryObj } from "@storybook/react";
import { RecipePreview } from "./recipes";

const meta: Meta<typeof RecipePreview> = {
  title: "Screens/Recipes/Preview",
  component: RecipePreview,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    viewport: { defaultViewport: "iphone14" },
    backgrounds: { default: "light" },
  },
};

export default meta;
type Story = StoryObj<typeof RecipePreview>;

export const Preview: Story = {};

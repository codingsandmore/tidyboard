import type { Meta, StoryObj } from "@storybook/react";
import { ShoppingList } from "./recipes";

const meta: Meta<typeof ShoppingList> = {
  title: "Screens/Recipes/ShoppingList",
  component: ShoppingList,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    viewport: { defaultViewport: "iphone14" },
    backgrounds: { default: "light" },
  },
};

export default meta;
type Story = StoryObj<typeof ShoppingList>;

export const Shopping: Story = {};

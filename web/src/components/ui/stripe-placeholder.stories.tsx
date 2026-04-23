import type { Meta, StoryObj } from "@storybook/react";
import { StripePlaceholder } from "./stripe-placeholder";

const meta: Meta<typeof StripePlaceholder> = {
  title: "UI/StripePlaceholder",
  component: StripePlaceholder,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof StripePlaceholder>;

export const Default: Story = {
  args: { w: "100%", h: 160 },
};

export const WithLabel: Story = {
  args: { w: "100%", h: 160, label: "Recipe Image" },
};

export const ShortHeight: Story = {
  args: { w: "100%", h: 80, label: "Thumbnail" },
};

export const TallHeight: Story = {
  args: { w: "100%", h: 320, label: "Hero Image" },
};

export const FixedWidth: Story = {
  args: { w: 200, h: 200, label: "Avatar" },
};

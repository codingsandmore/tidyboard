import type { Meta, StoryObj } from "@storybook/react";
import { FamilyShapes } from "./family-shapes";

const meta: Meta<typeof FamilyShapes> = {
  title: "UI/FamilyShapes",
  component: FamilyShapes,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
};

export default meta;
type Story = StoryObj<typeof FamilyShapes>;

export const Default: Story = {
  name: "Default (240px)",
  args: { size: 240 },
};

export const Large: Story = {
  name: "Large (480px)",
  args: { size: 480 },
};

export const Small: Story = {
  name: "Small (120px)",
  args: { size: 120 },
};

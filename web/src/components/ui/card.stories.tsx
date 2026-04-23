import type { Meta, StoryObj } from "@storybook/react";
import { Card } from "./card";

const meta: Meta<typeof Card> = {
  title: "UI/Card",
  component: Card,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
};

export default meta;
type Story = StoryObj<typeof Card>;

export const Default: Story = {
  args: {
    children: "Default card with standard padding",
    pad: 16,
  },
};

export const Elevated: Story = {
  args: {
    children: "Elevated card with shadow",
    elevated: true,
    pad: 16,
  },
};

export const Dark: Story = {
  args: {
    children: "Dark card variant",
    dark: true,
    pad: 16,
  },
  parameters: { backgrounds: { default: "dark" } },
};

export const CustomPadding: Story = {
  args: {
    children: "Card with 32px padding",
    pad: 32,
  },
};

export const SmallPadding: Story = {
  args: {
    children: "Card with 8px padding",
    pad: 8,
  },
};

export const Clickable: Story = {
  args: {
    children: "Clickable card — cursor is pointer",
    pad: 16,
    onClick: () => alert("Card clicked"),
  },
};

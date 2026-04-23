import type { Meta, StoryObj } from "@storybook/react";
import { Badge } from "./badge";
import { TB } from "@/lib/tokens";

const meta: Meta<typeof Badge> = {
  title: "UI/Badge",
  component: Badge,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
};

export default meta;
type Story = StoryObj<typeof Badge>;

export const Default: Story = {
  args: { children: "Default" },
};

export const Primary: Story = {
  args: { children: "Primary", color: TB.primary },
};

export const Success: Story = {
  args: { children: "Success", color: TB.success },
};

export const Warning: Story = {
  args: { children: "Warning", color: TB.warning },
};

export const Destructive: Story = {
  args: { children: "Destructive", color: TB.destructive },
};

export const Accent: Story = {
  args: { children: "Accent", color: TB.accent },
};

export const MemberColor: Story = {
  args: { children: "4 members", color: "#3B82F6" },
};

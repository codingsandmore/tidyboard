import type { Meta, StoryObj } from "@storybook/react";
import { Avatar, StackedAvatars } from "./avatar";
import { TBD } from "@/lib/data";

const [dad, mom, jackson, emma] = TBD.members;

const meta: Meta<typeof Avatar> = {
  title: "UI/Avatar",
  component: Avatar,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
};

export default meta;
type Story = StoryObj<typeof Avatar>;

// ── Each member ─────────────────────────────────────────────────────────────

export const Dad: Story = { args: { member: dad, size: 44 } };
export const Mom: Story = { args: { member: mom, size: 44 } };
export const Jackson: Story = { args: { member: jackson, size: 44 } };
export const Emma: Story = { args: { member: emma, size: 44 } };

// ── Sizes ────────────────────────────────────────────────────────────────────

export const Size24: Story = { name: "Size 24", args: { member: jackson, size: 24 } };
export const Size32: Story = { name: "Size 32", args: { member: jackson, size: 32 } };
export const Size44: Story = { name: "Size 44", args: { member: jackson, size: 44 } };
export const Size62: Story = { name: "Size 62", args: { member: jackson, size: 62 } };

// ── Ring / selection ─────────────────────────────────────────────────────────

export const Selected: Story = {
  args: { member: emma, size: 62, selected: true, ring: true },
};

export const NoRing: Story = {
  args: { member: emma, size: 44, ring: false },
};

export const WithRingUnselected: Story = {
  args: { member: emma, size: 44, ring: true, selected: false },
};

export const WithoutInitial: Story = {
  args: { member: dad, size: 44, showInitial: false },
};

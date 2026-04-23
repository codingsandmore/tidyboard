import type { Meta, StoryObj } from "@storybook/react";
import { StackedAvatars } from "./avatar";
import { TBD } from "@/lib/data";

const meta: Meta<typeof StackedAvatars> = {
  title: "UI/StackedAvatars",
  component: StackedAvatars,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
};

export default meta;
type Story = StoryObj<typeof StackedAvatars>;

export const TwoMembers: Story = {
  args: { members: TBD.members.slice(0, 2), size: 28 },
};

export const FourMembers: Story = {
  args: { members: TBD.members, size: 28 },
};

export const Overflow: Story = {
  name: "Overflow (5 members, max=3)",
  args: {
    members: [
      ...TBD.members,
      { id: "extra", name: "Extra", full: "Extra Person", role: "adult", color: "#8B5CF6", initial: "X", stars: 0, streak: 0 },
    ],
    size: 28,
    max: 3,
  },
};

export const SmallSize: Story = {
  args: { members: TBD.members, size: 18 },
};

export const LargeSize: Story = {
  args: { members: TBD.members, size: 44 },
};

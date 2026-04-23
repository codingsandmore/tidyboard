import type { Meta, StoryObj } from "@storybook/react";
import { KioskLockMembers } from "./routine";

const meta: Meta<typeof KioskLockMembers> = {
  title: "Screens/Routine/KioskLockMembers",
  component: KioskLockMembers,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    viewport: { defaultViewport: "desktop" },
    backgrounds: { default: "dark" },
  },
};

export default meta;
type Story = StoryObj<typeof KioskLockMembers>;

export const LockMembers: Story = {};

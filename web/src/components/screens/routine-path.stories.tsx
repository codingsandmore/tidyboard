import type { Meta, StoryObj } from "@storybook/react";
import { RoutinePath, KioskLock, KioskLockMembers } from "./routine";

// ── RoutinePath ────────────────────────────────────────────────────────────────

const meta: Meta<typeof RoutinePath> = {
  title: "Screens/Routine/Path",
  component: RoutinePath,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    viewport: { defaultViewport: "iphone14" },
    backgrounds: { default: "light" },
  },
};

export default meta;
type Story = StoryObj<typeof RoutinePath>;

export const Path: Story = {};

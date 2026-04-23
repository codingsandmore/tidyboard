import type { Meta, StoryObj } from "@storybook/react";
import { RoutineKid, RoutineChecklist, RoutinePath, KioskLock, KioskLockMembers } from "./routine";

// ── RoutineKid ────────────────────────────────────────────────────────────────

const meta: Meta<typeof RoutineKid> = {
  title: "Screens/Routine/KidHero",
  component: RoutineKid,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    viewport: { defaultViewport: "iphone14" },
    backgrounds: { default: "light" },
  },
};

export default meta;
type Story = StoryObj<typeof RoutineKid>;

export const KidHeroLight: Story = { args: { dark: false } };
export const KidHeroDark: Story = {
  args: { dark: true },
  parameters: { backgrounds: { default: "dark" } },
};

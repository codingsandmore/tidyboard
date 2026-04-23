import type { Meta, StoryObj } from "@storybook/react";
import { KioskLock, KioskLockMembers } from "./routine";

const lockMeta: Meta<typeof KioskLock> = {
  title: "Screens/Routine/KioskLock",
  component: KioskLock,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    viewport: { defaultViewport: "desktop" },
    backgrounds: { default: "dark" },
  },
};

export default lockMeta;
type LockStory = StoryObj<typeof KioskLock>;

export const Lock: LockStory = {};

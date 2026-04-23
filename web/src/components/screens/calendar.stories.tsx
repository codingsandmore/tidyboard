import type { Meta, StoryObj } from "@storybook/react";
import { CalDay, CalWeek, CalMonth, CalAgenda, EventModal } from "./calendar";

// ── CalDay ────────────────────────────────────────────────────────────────────

const dayMeta: Meta<typeof CalDay> = {
  title: "Screens/Calendar/Day",
  component: CalDay,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    viewport: { defaultViewport: "iphone14" },
    backgrounds: { default: "light" },
  },
};

export default dayMeta;
type DayStory = StoryObj<typeof CalDay>;

export const Day: DayStory = { args: { dark: false } };
export const DayDark: DayStory = {
  args: { dark: true },
  parameters: { backgrounds: { default: "dark" } },
};

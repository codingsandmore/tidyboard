import type { Meta, StoryObj } from "@storybook/react";
import { CalWeek } from "./calendar";

const meta: Meta<typeof CalWeek> = {
  title: "Screens/Calendar/Week",
  component: CalWeek,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    viewport: { defaultViewport: "ipad" },
    backgrounds: { default: "light" },
  },
};

export default meta;
type Story = StoryObj<typeof CalWeek>;

export const Week: Story = {};

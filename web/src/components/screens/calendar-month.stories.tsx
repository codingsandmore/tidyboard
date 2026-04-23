import type { Meta, StoryObj } from "@storybook/react";
import { CalMonth } from "./calendar";

const meta: Meta<typeof CalMonth> = {
  title: "Screens/Calendar/Month",
  component: CalMonth,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    viewport: { defaultViewport: "ipad" },
    backgrounds: { default: "light" },
  },
};

export default meta;
type Story = StoryObj<typeof CalMonth>;

export const Month: Story = {};

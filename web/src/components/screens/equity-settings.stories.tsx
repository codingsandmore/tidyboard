import type { Meta, StoryObj } from "@storybook/react";
import { Settings } from "./equity";

const meta: Meta<typeof Settings> = {
  title: "Screens/Equity/Settings",
  component: Settings,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    viewport: { defaultViewport: "iphone14" },
    backgrounds: { default: "light" },
  },
};

export default meta;
type Story = StoryObj<typeof Settings>;

export const EquitySettings: Story = {};

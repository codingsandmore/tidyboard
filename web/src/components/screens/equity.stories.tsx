import type { Meta, StoryObj } from "@storybook/react";
import { Equity, EquityScales, Settings, Race } from "./equity";

const meta: Meta<typeof Equity> = {
  title: "Screens/Equity/Overview",
  component: Equity,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    viewport: { defaultViewport: "iphone14" },
    backgrounds: { default: "light" },
  },
};

export default meta;
type Story = StoryObj<typeof Equity>;

export const EquityLight: Story = { args: { dark: false } };
export const EquityDark: Story = {
  args: { dark: true },
  parameters: { backgrounds: { default: "dark" } },
};

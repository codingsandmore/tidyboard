import type { Meta, StoryObj } from "@storybook/react";
import { EquityScales } from "./equity";

const meta: Meta<typeof EquityScales> = {
  title: "Screens/Equity/Scales",
  component: EquityScales,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    viewport: { defaultViewport: "iphone14" },
    backgrounds: { default: "light" },
  },
};

export default meta;
type Story = StoryObj<typeof EquityScales>;

export const Scales: Story = {};

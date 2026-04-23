import type { Meta, StoryObj } from "@storybook/react";
import { Race } from "./equity";

const meta: Meta<typeof Race> = {
  title: "Screens/Equity/Race",
  component: Race,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    viewport: { defaultViewport: "iphone14" },
    backgrounds: { default: "light" },
  },
};

export default meta;
type Story = StoryObj<typeof Race>;

export const RaceDefault: Story = {};

import type { Meta, StoryObj } from "@storybook/react";
import { DashPhone } from "./dashboard-phone";

const meta: Meta<typeof DashPhone> = {
  title: "Screens/DashboardPhone",
  component: DashPhone,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    viewport: { defaultViewport: "iphone14" },
    backgrounds: { default: "light" },
  },
};

export default meta;
type Story = StoryObj<typeof DashPhone>;

export const Default: Story = {};

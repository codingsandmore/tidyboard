import type { Meta, StoryObj } from "@storybook/react";
import { DashDesktop } from "./dashboard-desktop";

const meta: Meta<typeof DashDesktop> = {
  title: "Screens/DashboardDesktop",
  component: DashDesktop,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    viewport: { defaultViewport: "desktop" },
    backgrounds: { default: "light" },
  },
};

export default meta;
type Story = StoryObj<typeof DashDesktop>;

export const Default: Story = {};

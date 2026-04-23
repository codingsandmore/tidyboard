import type { Meta, StoryObj } from "@storybook/react";
import { DashKiosk } from "./dashboard-kiosk";

const meta: Meta<typeof DashKiosk> = {
  title: "Screens/DashboardKiosk",
  component: DashKiosk,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    viewport: { defaultViewport: "desktop" },
  },
};

export default meta;
type Story = StoryObj<typeof DashKiosk>;

export const Default: Story = {
  args: { dark: false },
  parameters: { backgrounds: { default: "light" } },
};

export const Dark: Story = {
  args: { dark: true },
  parameters: { backgrounds: { default: "dark" } },
};

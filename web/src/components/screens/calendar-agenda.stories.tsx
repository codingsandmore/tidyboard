import type { Meta, StoryObj } from "@storybook/react";
import { CalAgenda } from "./calendar";

const meta: Meta<typeof CalAgenda> = {
  title: "Screens/Calendar/Agenda",
  component: CalAgenda,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    viewport: { defaultViewport: "iphone14" },
    backgrounds: { default: "light" },
  },
};

export default meta;
type Story = StoryObj<typeof CalAgenda>;

export const Agenda: Story = {};

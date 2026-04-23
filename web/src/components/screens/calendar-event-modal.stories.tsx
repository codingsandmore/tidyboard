import type { Meta, StoryObj } from "@storybook/react";
import { EventModal } from "./calendar";

const meta: Meta<typeof EventModal> = {
  title: "Screens/Calendar/EventModal",
  component: EventModal,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    viewport: { defaultViewport: "iphone14" },
    backgrounds: { default: "light" },
  },
};

export default meta;
type Story = StoryObj<typeof EventModal>;

export const Modal: Story = {};

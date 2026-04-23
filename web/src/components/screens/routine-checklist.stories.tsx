import type { Meta, StoryObj } from "@storybook/react";
import { RoutineChecklist } from "./routine";

const meta: Meta<typeof RoutineChecklist> = {
  title: "Screens/Routine/Checklist",
  component: RoutineChecklist,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    viewport: { defaultViewport: "iphone14" },
    backgrounds: { default: "light" },
  },
};

export default meta;
type Story = StoryObj<typeof RoutineChecklist>;

export const Checklist: Story = {};

import type { Meta, StoryObj } from "@storybook/react";
import { ListsIndex, ListDetail } from "./lists";
import { TBD } from "@/lib/data";

const meta: Meta<typeof ListsIndex> = {
  title: "Screens/Lists/Index",
  component: ListsIndex,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    viewport: { defaultViewport: "iphone14" },
    backgrounds: { default: "light" },
  },
};

export default meta;
type Story = StoryObj<typeof ListsIndex>;

export const Index: Story = {};

import type { Meta, StoryObj } from "@storybook/react";
import { ListDetail } from "./lists";
import { TBD } from "@/lib/data";

const meta: Meta<typeof ListDetail> = {
  title: "Screens/Lists/Detail",
  component: ListDetail,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    viewport: { defaultViewport: "iphone14" },
    backgrounds: { default: "light" },
  },
};

export default meta;
type Story = StoryObj<typeof ListDetail>;

export const PackingList: Story = {
  args: { list: TBD.lists[0] },
};

export const ChoresList: Story = {
  args: { list: TBD.lists[1] },
};

export const ErrandsList: Story = {
  args: { list: TBD.lists[2] },
};

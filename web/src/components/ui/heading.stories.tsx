import type { Meta, StoryObj } from "@storybook/react";
import { H } from "./heading";

const meta: Meta<typeof H> = {
  title: "UI/Heading",
  component: H,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
};

export default meta;
type Story = StoryObj<typeof H>;

export const H1: Story = {
  name: "h1 — Display 36",
  args: { as: "h1", children: "The Smith Family Dashboard" },
};

export const H2: Story = {
  name: "h2 — Display 30",
  args: { as: "h2", children: "Today's Schedule" },
};

export const H3: Story = {
  name: "h3 — Display 24",
  args: { as: "h3", children: "What's for Dinner?" },
};

export const Kiosk: Story = {
  name: "kiosk — Display 48",
  args: { as: "kiosk", children: "10:34" },
};

export const Large: Story = {
  name: "large — Body 18",
  args: { as: "large", children: "Your family, organized." },
};

export const KioskBody: Story = {
  name: "kioskBody — Body 20",
  args: { as: "kioskBody", children: "Thursday, April 22" },
};

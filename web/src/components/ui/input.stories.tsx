import type { Meta, StoryObj } from "@storybook/react";
import { Input } from "./input";

const meta: Meta<typeof Input> = {
  title: "UI/Input",
  component: Input,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  decorators: [
    (Story) => (
      <div style={{ width: 320 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof Input>;

export const Default: Story = {
  args: { placeholder: "Enter text…" },
};

export const WithIcon: Story = {
  args: { placeholder: "Search…", icon: "search" },
};

export const FilledValue: Story = {
  args: { value: "sarah@smithfamily.net", placeholder: "Email" },
};

export const ErrorState: Story = {
  args: { value: "bad-input", error: true, placeholder: "Email" },
};

export const PasswordType: Story = {
  args: { type: "password", value: "supersecret", placeholder: "Password" },
};

export const NarrowWidth: Story = {
  args: { placeholder: "Search…", icon: "search", full: false },
};

import type { Meta, StoryObj } from "@storybook/react";
import { Btn } from "./button";

const meta: Meta<typeof Btn> = {
  title: "UI/Button",
  component: Btn,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
};

export default meta;
type Story = StoryObj<typeof Btn>;

// ── Individual kind × size combinations ────────────────────────────────────

export const PrimarySm: Story = { args: { children: "Primary SM", kind: "primary", size: "sm" } };
export const PrimaryMd: Story = { args: { children: "Primary MD", kind: "primary", size: "md" } };
export const PrimaryLg: Story = { args: { children: "Primary LG", kind: "primary", size: "lg" } };
export const PrimaryXl: Story = { args: { children: "Primary XL", kind: "primary", size: "xl" } };

export const SecondarySm: Story = { args: { children: "Secondary SM", kind: "secondary", size: "sm" } };
export const SecondaryMd: Story = { args: { children: "Secondary MD", kind: "secondary", size: "md" } };
export const SecondaryLg: Story = { args: { children: "Secondary LG", kind: "secondary", size: "lg" } };
export const SecondaryXl: Story = { args: { children: "Secondary XL", kind: "secondary", size: "xl" } };

export const GhostSm: Story = { args: { children: "Ghost SM", kind: "ghost", size: "sm" } };
export const GhostMd: Story = { args: { children: "Ghost MD", kind: "ghost", size: "md" } };
export const GhostLg: Story = { args: { children: "Ghost LG", kind: "ghost", size: "lg" } };
export const GhostXl: Story = { args: { children: "Ghost XL", kind: "ghost", size: "xl" } };

export const DestructiveSm: Story = { args: { children: "Delete SM", kind: "destructive", size: "sm" } };
export const DestructiveMd: Story = { args: { children: "Delete MD", kind: "destructive", size: "md" } };
export const DestructiveLg: Story = { args: { children: "Delete LG", kind: "destructive", size: "lg" } };
export const DestructiveXl: Story = { args: { children: "Delete XL", kind: "destructive", size: "xl" } };

export const AccentSm: Story = { args: { children: "Accent SM", kind: "accent", size: "sm" } };
export const AccentMd: Story = { args: { children: "Accent MD", kind: "accent", size: "md" } };
export const AccentLg: Story = { args: { children: "Accent LG", kind: "accent", size: "lg" } };
export const AccentXl: Story = { args: { children: "Accent XL", kind: "accent", size: "xl" } };

// ── Icon variants ───────────────────────────────────────────────────────────

export const WithIconLeft: Story = {
  args: { children: "Add Event", kind: "primary", size: "md", icon: "plus" },
};

export const WithIconRight: Story = {
  args: { children: "Continue", kind: "primary", size: "md", iconRight: "arrowR" },
};

export const IconOnly: Story = {
  args: { icon: "search", kind: "ghost", size: "md" },
};

// ── States ──────────────────────────────────────────────────────────────────

export const Disabled: Story = {
  args: { children: "Disabled", kind: "primary", size: "md", disabled: true },
};

export const FullWidth: Story = {
  args: { children: "Full Width", kind: "primary", size: "lg", full: true },
  parameters: { layout: "padded" },
};

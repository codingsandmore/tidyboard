import type { Meta, StoryObj } from "@storybook/react";
import { Onboarding, ONBOARDING_LABELS } from "./onboarding";

const meta: Meta<typeof Onboarding> = {
  title: "Screens/Onboarding",
  component: Onboarding,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    viewport: { defaultViewport: "iphone14" },
    backgrounds: { default: "light" },
  },
};

export default meta;
type Story = StoryObj<typeof Onboarding>;

export const Step0Welcome: Story = {
  name: `Step 0 — ${ONBOARDING_LABELS[0]}`,
  args: { step: 0 },
};

export const Step1CreateAccount: Story = {
  name: `Step 1 — ${ONBOARDING_LABELS[1]}`,
  args: { step: 1 },
};

export const Step2HouseholdName: Story = {
  name: `Step 2 — ${ONBOARDING_LABELS[2]}`,
  args: { step: 2 },
};

export const Step3AddSelf: Story = {
  name: `Step 3 — ${ONBOARDING_LABELS[3]}`,
  args: { step: 3 },
};

export const Step4AddFamily: Story = {
  name: `Step 4 — ${ONBOARDING_LABELS[4]}`,
  args: { step: 4 },
};

export const Step5ConnectCalendar: Story = {
  name: `Step 5 — ${ONBOARDING_LABELS[5]}`,
  args: { step: 5 },
};

export const Step6AllSet: Story = {
  name: `Step 6 — ${ONBOARDING_LABELS[6]}`,
  args: { step: 6 },
};

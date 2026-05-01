import type { Meta, StoryObj } from "@storybook/react";
import { EventCard } from "./EventCard";
import type { Member, TBDEvent } from "@/lib/data";

const dad: Member = {
  id: "dad",
  name: "Dad",
  full: "Fred",
  role: "adult",
  color: "#3B82F6",
  initial: "F",
  stars: 0,
  streak: 0,
};

const mom: Member = {
  id: "mom",
  name: "Mom",
  full: "Wilma",
  role: "adult",
  color: "#EF4444",
  initial: "W",
  stars: 0,
  streak: 0,
};

const baseEvent: TBDEvent = {
  id: "evt-story-1",
  title: "Soccer practice",
  start: "16:00",
  end: "17:00",
  members: ["dad"],
  location: "Park",
};

const meta: Meta<typeof EventCard> = {
  title: "Calendar/EventCard",
  component: EventCard,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
  },
};

export default meta;
type Story = StoryObj<typeof EventCard>;

export const Full: Story = {
  args: {
    event: baseEvent,
    members: [dad],
    variant: "full",
  },
};

export const FullMultipleAssignees: Story = {
  args: {
    event: { ...baseEvent, members: ["dad", "mom"] },
    members: [dad, mom],
    variant: "full",
  },
};

export const FullNoLocation: Story = {
  args: {
    event: { ...baseEvent, location: undefined },
    members: [dad],
    variant: "full",
  },
};

export const Compact: Story = {
  args: {
    event: baseEvent,
    members: [dad],
    variant: "compact",
  },
};

export const CompactNoMembers: Story = {
  args: {
    event: baseEvent,
    members: [],
    variant: "compact",
  },
};

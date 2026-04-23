import type { Meta, StoryObj } from "@storybook/react";
import { Icon, type IconName } from "./icon";

const ALL_ICONS: IconName[] = [
  "calendar", "check", "checkCircle", "plus", "minus", "x",
  "chevronL", "chevronR", "chevronDown", "menu", "user", "users",
  "home", "list", "chef", "star", "flame", "flag", "clock", "bell",
  "mapPin", "search", "settings", "google", "apple", "eye", "camera",
  "link", "trophy", "sun", "moon", "sparkles", "filter", "drag",
  "cloud", "heart", "arrowR", "arrowL", "share", "trash", "pencil",
  "route", "lock", "grid", "columns", "rows", "play", "pause",
];

const meta: Meta<typeof Icon> = {
  title: "UI/Icon",
  component: Icon,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  argTypes: {
    name: {
      control: "select",
      options: ALL_ICONS,
    },
  },
};

export default meta;
type Story = StoryObj<typeof Icon>;

export const Single: Story = {
  args: { name: "calendar", size: 24 },
};

export const AllIcons: Story = {
  name: "All Icons Grid",
  render: () => (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(8, 80px)",
        gap: 16,
        padding: 24,
        fontFamily: "system-ui, sans-serif",
      }}
    >
      {ALL_ICONS.map((name) => (
        <div
          key={name}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Icon name={name} size={24} />
          <span style={{ fontSize: 10, color: "#78716C", textAlign: "center", wordBreak: "break-all" }}>
            {name}
          </span>
        </div>
      ))}
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
      {[12, 16, 20, 24, 32, 40].map((size) => (
        <div key={size} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <Icon name="star" size={size} />
          <span style={{ fontSize: 10, color: "#78716C" }}>{size}px</span>
        </div>
      ))}
    </div>
  ),
};

export const Colors: Story = {
  render: () => (
    <div style={{ display: "flex", gap: 16 }}>
      {["#4F7942", "#EF4444", "#F59E0B", "#3B82F6", "#7FB5B0", "#78716C"].map((color) => (
        <Icon key={color} name="heart" size={28} color={color} />
      ))}
    </div>
  ),
};

import type { Meta, StoryObj } from "@storybook/react";
import { PageShell } from "./page-shell";
import { TB } from "@/lib/tokens";

const meta: Meta<typeof PageShell> = {
  title: "Layout/PageShell",
  component: PageShell,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
  },
};

export default meta;
type Story = StoryObj<typeof PageShell>;

const SampleHeader = ({ dark = false }: { dark?: boolean }) => (
  <div
    style={{
      padding: "14px 20px",
      borderBottom: `1px solid ${dark ? TB.dBorderSoft : TB.borderSoft}`,
      background: dark ? TB.dSurface : TB.surface,
      fontFamily: TB.fontDisplay,
      fontWeight: 600,
      color: dark ? TB.dText : TB.text,
    }}
  >
    tidyboard
  </div>
);

const SampleFooter = ({ dark = false }: { dark?: boolean }) => (
  <div
    style={{
      padding: "10px 20px",
      borderTop: `1px solid ${dark ? TB.dBorderSoft : TB.borderSoft}`,
      background: dark ? TB.dSurface : TB.surface,
      fontFamily: TB.fontMono,
      fontSize: 12,
      color: dark ? TB.dText2 : TB.text2,
    }}
  >
    Footer slot · BottomNav goes here
  </div>
);

const SampleMain = () => (
  <div style={{ padding: 20 }}>
    <h2 style={{ fontFamily: TB.fontDisplay, marginBottom: 8 }}>Main slot</h2>
    <p style={{ fontSize: 14, color: TB.text2 }}>
      The main slot is the scrollable content area. Pages compose PageShell
      and place their domain content here.
    </p>
  </div>
);

export const HeaderMainFooter: Story = {
  args: {
    header: <SampleHeader />,
    children: <SampleMain />,
    footer: <SampleFooter />,
  },
};

export const HeaderAndMain: Story = {
  args: {
    header: <SampleHeader />,
    children: <SampleMain />,
  },
};

export const MainOnly: Story = {
  args: {
    children: <SampleMain />,
  },
};

export const Dark: Story = {
  args: {
    dark: true,
    header: <SampleHeader dark />,
    children: <SampleMain />,
    footer: <SampleFooter dark />,
  },
  parameters: {
    backgrounds: { default: "dark" },
  },
};

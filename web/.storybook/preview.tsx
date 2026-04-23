import type { Preview } from "@storybook/react";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NextIntlClientProvider } from "next-intl";
import messages from "../src/i18n/messages/en.json";

// Font class names injected by Next.js layout — replicate in Storybook
// by injecting the CSS variables directly into the preview.
const fontStyle = `
  :root {
    --font-fraunces: "Fraunces", Georgia, serif;
    --font-inter: "Inter", system-ui, sans-serif;
    --font-jetbrains-mono: "JetBrains Mono", monospace;
  }
  @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..900;1,9..144,300..900&family=Inter:wght@300..900&family=JetBrains+Mono:wght@400;500;600&display=swap');
`;

const makeQueryClient = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });

const GlobalDecorator = ({ children }: { children: React.ReactNode }) => {
  const [queryClient] = React.useState(makeQueryClient);
  return (
    <NextIntlClientProvider locale="en" messages={messages as Record<string, unknown>}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </NextIntlClientProvider>
  );
};

const preview: Preview = {
  decorators: [
    (Story) => (
      <GlobalDecorator>
        <Story />
      </GlobalDecorator>
    ),
  ],

  parameters: {
    backgrounds: {
      default: "light",
      values: [
        { name: "light", value: "#FAFAF9" },
        { name: "dark", value: "#1C1917" },
      ],
    },

    viewport: {
      viewports: {
        iphone14: {
          name: "iPhone 14 (390)",
          styles: { width: "390px", height: "844px" },
        },
        ipad: {
          name: "iPad (768)",
          styles: { width: "768px", height: "1024px" },
        },
        desktop: {
          name: "Desktop (1440)",
          styles: { width: "1440px", height: "900px" },
        },
      },
      defaultViewport: "responsive",
    },

    a11y: {
      config: {
        rules: [
          { id: "color-contrast", enabled: true },
          { id: "label", enabled: true },
        ],
      },
    },

    docs: {
      toc: true,
    },
  },

  globalTypes: {
    fontStyle: {
      defaultValue: fontStyle,
    },
  },
};

// Inject fonts into the head once
if (typeof document !== "undefined") {
  const style = document.createElement("style");
  style.textContent = fontStyle;
  document.head.appendChild(style);
}

export default preview;

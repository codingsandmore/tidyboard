import type { Metadata, Viewport } from "next";
import { Fraunces, Inter, JetBrains_Mono } from "next/font/google";
import { getLocale, getMessages } from "next-intl/server";
import "./globals.css";
import { ThemeProvider, NoFlashScript } from "@/components/theme-provider";
import { ApiProvider } from "@/lib/api/provider";
import { AuthProvider } from "@/lib/auth/auth-store";
import { WSProvider } from "@/lib/ws/ws-provider";
import { I18nProvider } from "@/i18n/provider";

// Variable fonts — no `weight` option means the full axis is loaded, so
// arbitrary values like 450 / 550 / 650 from the design tokens interpolate
// correctly at runtime instead of snapping to a static cut.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://tidyboard.dev"),
  title: {
    default: "Tidyboard — The family dashboard you actually own",
    template: "%s · Tidyboard",
  },
  description:
    "Open-source, self-hosted family dashboard: shared calendar, routines, chore gamification, recipes, meal planning, shopping lists, and household equity tracking.",
  keywords: [
    "family dashboard",
    "shared calendar",
    "chore tracker",
    "meal planning",
    "open source",
    "self-hosted",
    "PWA",
  ],
  manifest: "/manifest.webmanifest",
  openGraph: {
    type: "website",
    siteName: "Tidyboard",
    title: "Tidyboard — The family dashboard you actually own",
    description:
      "Open-source, self-hosted family dashboard: shared calendar, routines, chore gamification, recipes, meal planning, and more.",
    url: "https://tidyboard.dev",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Tidyboard — family dashboard",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Tidyboard — The family dashboard you actually own",
    description:
      "Open-source, self-hosted family dashboard: shared calendar, routines, chore gamification, recipes, meal planning, and more.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#4F7942",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      className={`${fraunces.variable} ${inter.variable} ${jetbrainsMono.variable}`}
    >
      <head>
        <NoFlashScript />
      </head>
      <body>
        <I18nProvider locale={locale} messages={messages as Record<string, unknown>}>
          <ThemeProvider>
            <ApiProvider>
              <AuthProvider>
                <WSProvider>{children}</WSProvider>
              </AuthProvider>
            </ApiProvider>
          </ThemeProvider>
        </I18nProvider>
      </body>
    </html>
  );
}

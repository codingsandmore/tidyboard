import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kiosk Lock Screen",
  description: "Tidyboard kiosk lock screen — tap to unlock and select a family member.",
};

export default function LockLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

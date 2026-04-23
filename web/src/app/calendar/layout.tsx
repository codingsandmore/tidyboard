import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Calendar",
  description:
    "View and manage your family calendar. Daily, weekly, monthly, and agenda views with color-coded member events.",
};

export default function CalendarLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

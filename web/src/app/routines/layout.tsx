import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Routines",
  description:
    "Manage family routines with step-by-step checklists, timers, and streak tracking.",
};

export default function RoutinesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

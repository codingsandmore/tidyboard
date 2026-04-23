import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Household Balance",
  description:
    "Track household task ownership, time contributions, and equity between family members.",
};

export default function EquityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

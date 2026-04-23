import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Get Started",
  description:
    "Set up your Tidyboard household in minutes. Create an account, add family members, and connect your calendar.",
};

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

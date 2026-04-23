// Adaptive dashboard — picks layout by CSS media query, not JS resize.
// All three variants render into the DOM and CSS hides two of them.
// This avoids the SSR-empty → client-populated flash that JS-based
// viewport detection causes.
//
// Dark mode: DashKiosk supports dark prop and is wired to useTheme.
// DashPhone and DashDesktop do not yet support dark mode — they render
// as light regardless of the user's theme preference.

"use client";

import { DashPhone } from "@/components/screens/dashboard-phone";
import { DashKiosk } from "@/components/screens/dashboard-kiosk";
import { DashDesktop } from "@/components/screens/dashboard-desktop";
import { useTheme } from "@/components/theme-provider";

export function AdaptiveDashboard() {
  const { theme } = useTheme();

  return (
    <>
      <div className="tb-variant tb-variant-phone">
        <DashPhone />
      </div>
      <div className="tb-variant tb-variant-kiosk">
        <DashKiosk dark={theme === "dark"} />
      </div>
      <div className="tb-variant tb-variant-desktop">
        <DashDesktop />
      </div>
    </>
  );
}

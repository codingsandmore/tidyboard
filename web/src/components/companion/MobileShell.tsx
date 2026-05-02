"use client";

/**
 * MobileShell — mobile-first chrome for the Companion PWA (issue #89).
 *
 * Provides a phone-friendly layout with:
 *   - sticky top header carrying the page heading and an optional badge
 *   - main content area (scrollable, mobile-padded)
 *   - bottom tab bar with the 3 companion sections (events / chores / shopping)
 *
 * Active tab is determined by `active` prop (string id) rather than reading
 * `usePathname` so the shell can be rendered/snapshot-tested in isolation
 * without a Next router. Each tab is a real `<a>` so the test environment's
 * mocked `next/link` and the production runtime both render plain anchors.
 *
 * The shell is intentionally read-only and stateless; the companion pages
 * compose it with their own list views.
 */

import type { ReactNode } from "react";

/** A tab entry on the bottom navigation. */
export type CompanionTab = {
  /** Stable id (matches the page's section, e.g. "events"). */
  id: "home" | "events" | "chores" | "shopping";
  /** Visible label. */
  label: string;
  /** Route href. */
  href: string;
  /** Glyph (single emoji or short string) — kept tiny to match the phone scale. */
  icon: string;
};

/**
 * Canonical tab list for the companion PWA. Exported so tests and the
 * manifest endpoint can stay in sync.
 */
export const COMPANION_TABS: readonly CompanionTab[] = [
  { id: "home", label: "Home", href: "/companion", icon: "○" },
  { id: "events", label: "Events", href: "/companion/events", icon: "▦" },
  { id: "chores", label: "Chores", href: "/companion/chores", icon: "✓" },
  { id: "shopping", label: "Shopping", href: "/companion/shopping", icon: "◉" },
] as const;

export interface MobileShellProps {
  /** Current section id; controls which tab shows the active indicator. */
  active: CompanionTab["id"];
  /** Page heading shown in the sticky header. */
  heading: string;
  /** Optional one-line subheading (small text under the heading). */
  subheading?: string;
  /** Page body. */
  children: ReactNode;
}

/**
 * Renders the mobile shell. Everything is plain anchors + inline styles to
 * avoid pulling in Tailwind/JSDOM differences during tests.
 */
export function MobileShell({
  active,
  heading,
  subheading,
  children,
}: MobileShellProps) {
  return (
    <div
      data-testid="companion-shell"
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        background: "#FAFAF9",
        color: "#111827",
        // Mobile-first cap: the companion is a phone experience, but we
        // gracefully widen on tablets without becoming the kiosk layout.
        maxWidth: 540,
        margin: "0 auto",
        boxShadow: "0 0 0 1px #f1f1ee",
      }}
    >
      <header
        data-testid="companion-header"
        style={{
          position: "sticky",
          top: 0,
          background: "rgba(250,250,249,0.94)",
          backdropFilter: "saturate(140%) blur(8px)",
          WebkitBackdropFilter: "saturate(140%) blur(8px)",
          padding: "16px 20px 12px",
          borderBottom: "1px solid #ececeb",
          zIndex: 10,
        }}
      >
        <div style={{ fontSize: 12, color: "#6b7280", letterSpacing: 0.4 }}>
          TIDYBOARD COMPANION
        </div>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600 }}>{heading}</h1>
        {subheading ? (
          <div style={{ marginTop: 2, fontSize: 13, color: "#6b7280" }}>
            {subheading}
          </div>
        ) : null}
      </header>

      <main
        data-testid="companion-main"
        style={{
          flex: 1,
          padding: "16px 16px 96px",
          overflowY: "auto",
        }}
      >
        {children}
      </main>

      <nav
        data-testid="companion-tabs"
        aria-label="Companion sections"
        style={{
          position: "sticky",
          bottom: 0,
          display: "grid",
          gridTemplateColumns: `repeat(${COMPANION_TABS.length}, 1fr)`,
          background: "#ffffff",
          borderTop: "1px solid #ececeb",
          padding: "8px 4px calc(env(safe-area-inset-bottom, 0px) + 8px)",
          zIndex: 10,
        }}
      >
        {COMPANION_TABS.map((tab) => {
          const isActive = tab.id === active;
          return (
            <a
              key={tab.id}
              href={tab.href}
              data-testid={`companion-tab-${tab.id}`}
              aria-current={isActive ? "page" : undefined}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 2,
                padding: "6px 2px",
                color: isActive ? "#4F7942" : "#6b7280",
                fontSize: 11,
                textDecoration: "none",
                fontWeight: isActive ? 600 : 500,
              }}
            >
              <span style={{ fontSize: 18, lineHeight: 1 }} aria-hidden>
                {tab.icon}
              </span>
              <span>{tab.label}</span>
            </a>
          );
        })}
      </nav>
    </div>
  );
}

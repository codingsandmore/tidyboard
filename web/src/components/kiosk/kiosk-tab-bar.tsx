"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { TB } from "@/lib/tokens";
import { Icon, type IconName } from "@/components/ui/icon";

/**
 * KioskTabBar — touch-friendly bottom navigation for fixed Cozyla-style
 * kiosk pages (Today / Week / Meals / Tasks). Each tab is a large hit
 * target (>= 64px tall, >= 96px wide) suitable for a wall-mounted tablet.
 *
 * The bar is rendered at the bottom of {@link PageShell}. Active state is
 * driven by the `active` prop so server components and route-based pages
 * share a single visual contract.
 */
export interface KioskTab {
  /** Stable slug used as tab id and for keyboard shortcut hint. */
  id: "today" | "week" | "meals" | "tasks";
  /** Visible label. */
  label: string;
  /** Route the tab links to. */
  href: string;
  /** Icon shown above the label. */
  icon: IconName;
}

export interface KioskTabBarProps {
  tabs: KioskTab[];
  activeId: KioskTab["id"];
  /** Test id for the outer nav element. */
  "data-testid"?: string;
}

export const DEFAULT_KIOSK_TABS: KioskTab[] = [
  { id: "today", label: "Today", href: "/kiosk/today", icon: "calendar" },
  { id: "week", label: "Week", href: "/kiosk/week", icon: "list" },
  { id: "meals", label: "Meals", href: "/kiosk/meals", icon: "chef" },
  { id: "tasks", label: "Tasks", href: "/kiosk/tasks", icon: "checkCircle" },
];

export function KioskTabBar({ tabs, activeId, ...rest }: KioskTabBarProps) {
  const containerStyle: CSSProperties = {
    display: "flex",
    width: "100%",
    background: TB.surface,
    borderTop: `1px solid ${TB.border}`,
    boxSizing: "border-box",
    padding: "8px 12px",
    gap: 8,
  };

  return (
    <nav
      data-testid={rest["data-testid"] ?? "kiosk-tab-bar"}
      aria-label="Kiosk pages"
      style={containerStyle}
    >
      {tabs.map((tab) => {
        const active = tab.id === activeId;
        const tabStyle: CSSProperties = {
          flex: 1,
          minHeight: 72,
          minWidth: 96,
          padding: "10px 14px",
          borderRadius: TB.r.lg,
          background: active ? TB.primary : "transparent",
          color: active ? TB.primaryFg : TB.text2,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 4,
          fontFamily: TB.fontBody,
          fontSize: 14,
          fontWeight: active ? 600 : 500,
          textDecoration: "none",
          border: "none",
          cursor: "pointer",
          transition: "background 0.15s, color 0.15s",
        };
        return (
          <Link
            key={tab.id}
            href={tab.href}
            data-testid={`kiosk-tab-${tab.id}`}
            data-active={active ? "true" : "false"}
            aria-current={active ? "page" : undefined}
            style={tabStyle}
          >
            <Icon
              name={tab.icon}
              size={26}
              color={active ? TB.primaryFg : TB.text2}
            />
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

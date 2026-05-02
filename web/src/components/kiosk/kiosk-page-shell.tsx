"use client";

import type { ReactNode } from "react";
import { PageShell } from "@/components/layout/page-shell";
import { TB } from "@/lib/tokens";
import {
  DEFAULT_KIOSK_TABS,
  KioskTabBar,
  type KioskTab,
} from "./kiosk-tab-bar";

/**
 * KioskPageShell — shared chrome for fixed Cozyla-style kiosk pages.
 *
 * Wraps {@link PageShell} with the {@link KioskTabBar} footer and a
 * consistent content padding suitable for 1920×1080 displays. Each
 * /kiosk/<tab> route renders one of these and passes its widgets as
 * children.
 */
export interface KioskPageShellProps {
  /** Active tab id (drives the navigation highlight). */
  activeId: KioskTab["id"];
  /** Optional override for the tab list. Defaults to the four canonical tabs. */
  tabs?: KioskTab[];
  /** Page heading rendered above the widget grid. */
  heading?: ReactNode;
  /** Page description rendered below the heading. */
  subheading?: ReactNode;
  /** Widget grid (or any custom layout) for the page. */
  children?: ReactNode;
  /** Test id for the outer shell. */
  "data-testid"?: string;
}

export function KioskPageShell({
  activeId,
  tabs = DEFAULT_KIOSK_TABS,
  heading,
  subheading,
  children,
  ...rest
}: KioskPageShellProps) {
  return (
    <PageShell
      data-testid={rest["data-testid"] ?? `kiosk-page-${activeId}`}
      footer={<KioskTabBar tabs={tabs} activeId={activeId} />}
      contentStyle={{
        padding: "28px 32px 20px",
        display: "flex",
        flexDirection: "column",
        gap: 18,
      }}
    >
      {(heading || subheading) && (
        <header style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {heading && (
            <h1
              style={{
                margin: 0,
                fontFamily: TB.fontDisplay,
                fontSize: 36,
                fontWeight: 500,
                color: TB.text,
                letterSpacing: "-0.02em",
              }}
            >
              {heading}
            </h1>
          )}
          {subheading && (
            <p style={{ margin: 0, fontSize: 14, color: TB.text2 }}>{subheading}</p>
          )}
        </header>
      )}
      {children}
    </PageShell>
  );
}

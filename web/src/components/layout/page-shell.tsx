"use client";

import type { CSSProperties, ReactNode } from "react";
import { TB } from "@/lib/tokens";

/**
 * PageShell — shared layout primitive.
 *
 * Renders a vertical flex column with three optional slots:
 *   - `header`   : top chrome (sticky-ish; rendered above scroll area)
 *   - `children` : main scrollable content
 *   - `footer`   : bottom chrome (e.g. BottomNav)
 *
 * All chrome colors come from TB tokens. Pages should compose PageShell
 * instead of replicating the surface/border/padding triplet inline.
 */
export interface PageShellProps {
  /** Top chrome slot. */
  header?: ReactNode;
  /** Main scrollable content. */
  children?: ReactNode;
  /** Bottom chrome slot (e.g. BottomNav). */
  footer?: ReactNode;
  /** Whether to use dark TB tokens. */
  dark?: boolean;
  /** Override the background. Defaults to TB.bg / TB.dBg. */
  background?: string;
  /** Override the foreground (text) color. */
  color?: string;
  /** Padding applied to the main content area. Pass 0 to disable. */
  contentPadding?: number | string;
  /** Whether the main content area should scroll. Defaults to true. */
  scrollable?: boolean;
  /** Extra style overrides on the outer container. */
  style?: CSSProperties;
  /** Extra style overrides on the main content area. */
  contentStyle?: CSSProperties;
  /** Test id for the outer container. */
  "data-testid"?: string;
}

export function PageShell({
  header,
  children,
  footer,
  dark = false,
  background,
  color,
  contentPadding,
  scrollable = true,
  style,
  contentStyle,
  ...rest
}: PageShellProps) {
  const bg = background ?? (dark ? TB.dBg : TB.bg);
  const fg = color ?? (dark ? TB.dText : TB.text);

  return (
    <div
      data-testid={rest["data-testid"]}
      style={{
        width: "100%",
        height: "100%",
        background: bg,
        color: fg,
        fontFamily: TB.fontBody,
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
        ...style,
      }}
    >
      {header !== undefined && header !== null && (
        <div data-page-shell-slot="header">{header}</div>
      )}
      <div
        data-page-shell-slot="main"
        style={{
          flex: 1,
          minHeight: 0,
          overflow: scrollable ? "auto" : "hidden",
          padding: contentPadding,
          ...contentStyle,
        }}
      >
        {children}
      </div>
      {footer !== undefined && footer !== null && (
        <div data-page-shell-slot="footer">{footer}</div>
      )}
    </div>
  );
}

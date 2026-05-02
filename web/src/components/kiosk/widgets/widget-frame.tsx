"use client";

import type { CSSProperties, ReactNode } from "react";
import { TB } from "@/lib/tokens";

/**
 * WidgetFrame — uniform card chrome for kiosk widgets.
 *
 * Cozyla-style fixed kiosk pages compose multiple widgets in a grid. Every
 * widget shares the same shell (rounded surface, eyebrow + title + body)
 * so the page templates stay declarative and visually consistent.
 *
 * Pure presentational — no data fetching, no state.
 */
export interface WidgetFrameProps {
  /** Eyebrow text rendered above the title (uppercase, mono). */
  eyebrow?: ReactNode;
  /** Large display title. */
  title?: ReactNode;
  /** Optional right-side action (e.g. tab or count badge). */
  trailing?: ReactNode;
  /** Body content. */
  children?: ReactNode;
  /** Padding override (number → px). */
  padding?: number | string;
  /** Background override; defaults to TB.surface. */
  background?: string;
  /** Test id for the outer card. */
  "data-testid"?: string;
  /** Extra style overrides on the outer card. */
  style?: CSSProperties;
}

export function WidgetFrame({
  eyebrow,
  title,
  trailing,
  children,
  padding = 20,
  background,
  style,
  ...rest
}: WidgetFrameProps) {
  const containerStyle: CSSProperties = {
    background: background ?? TB.surface,
    borderRadius: TB.r.xl,
    padding,
    boxShadow: TB.shadow,
    display: "flex",
    flexDirection: "column",
    minHeight: 0,
    boxSizing: "border-box",
    ...style,
  };

  return (
    <section
      data-testid={rest["data-testid"]}
      style={containerStyle}
    >
      {(eyebrow || title || trailing) && (
        <header
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
            marginBottom: 12,
          }}
        >
          <div style={{ minWidth: 0, flex: 1 }}>
            {eyebrow !== undefined && eyebrow !== null && (
              <div
                style={{
                  fontFamily: TB.fontMono,
                  fontSize: 11,
                  letterSpacing: "0.1em",
                  color: TB.text2,
                  textTransform: "uppercase",
                  marginBottom: 4,
                }}
              >
                {eyebrow}
              </div>
            )}
            {title !== undefined && title !== null && (
              <div
                style={{
                  fontFamily: TB.fontDisplay,
                  fontSize: 22,
                  fontWeight: 500,
                  color: TB.text,
                  lineHeight: 1.15,
                }}
              >
                {title}
              </div>
            )}
          </div>
          {trailing !== undefined && trailing !== null && (
            <div style={{ flexShrink: 0 }}>{trailing}</div>
          )}
        </header>
      )}
      <div style={{ flex: 1, minHeight: 0 }}>{children}</div>
    </section>
  );
}

/**
 * WidgetEmpty — uniform empty state for widgets that have no live data.
 * Routes that opted into the live-only data contract should never fall
 * back to demo data; instead they render an explicit empty card.
 */
export function WidgetEmpty({
  message,
  hint,
  testId,
}: {
  message: string;
  hint?: string;
  testId?: string;
}) {
  return (
    <div
      data-testid={testId}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        color: TB.text2,
        padding: "12px 4px",
        gap: 4,
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 500 }}>{message}</div>
      {hint && (
        <div style={{ fontSize: 12, color: TB.muted }}>{hint}</div>
      )}
    </div>
  );
}

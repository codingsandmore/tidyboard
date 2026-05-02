"use client";

import { useEffect, useState } from "react";

export interface SleepScheduleProps {
  /** Quiet-hour start, "HH:MM" 24h. e.g. "22:00". */
  start: string;
  /** Quiet-hour end, "HH:MM" 24h. e.g. "06:00". */
  end: string;
  /**
   * Optional clock injection (tests). When omitted the component reads
   * `Date.now()` once per minute.
   */
  now?: Date;
  /**
   * Background color of the dim overlay. Defaults to a near-black with
   * 70% opacity so kiosk content remains faintly visible.
   */
  overlayColor?: string;
  /**
   * Children rendered behind the overlay. The overlay sits on top with
   * pointer-events:none so taps still register on the underlying UI.
   */
  children?: React.ReactNode;
}

/**
 * Returns true when `now` falls within the quiet-hours window
 * `[start, end)`. Wraps midnight (e.g. 22:00 → 06:00).
 */
export function isWithinQuietHours(start: string, end: string, now: Date): boolean {
  const toMinutes = (hhmm: string): number | null => {
    const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
    if (!m) return null;
    const h = Number(m[1]);
    const mm = Number(m[2]);
    if (h < 0 || h > 23 || mm < 0 || mm > 59) return null;
    return h * 60 + mm;
  };
  const s = toMinutes(start);
  const e = toMinutes(end);
  if (s == null || e == null) return false;
  const cur = now.getHours() * 60 + now.getMinutes();
  if (s === e) return false;
  if (s < e) return cur >= s && cur < e;
  // Wrap: window crosses midnight.
  return cur >= s || cur < e;
}

/**
 * SleepSchedule — when the current local time is within the configured
 * quiet-hours window, renders a dim overlay on top of children so the
 * kiosk dims itself for sleeping family members.
 *
 * Issue #88. Admin configuration for `start`/`end` lives in settings;
 * this component just renders the visual state.
 */
export function SleepSchedule({
  start,
  end,
  now,
  overlayColor = "rgba(0, 0, 0, 0.7)",
  children,
}: SleepScheduleProps) {
  const [tick, setTick] = useState<Date>(now ?? new Date());

  useEffect(() => {
    if (now) {
      setTick(now);
      return;
    }
    const id = setInterval(() => setTick(new Date()), 60_000);
    return () => clearInterval(id);
  }, [now]);

  const dim = isWithinQuietHours(start, end, tick);

  return (
    <div data-testid="sleep-schedule" style={{ position: "relative" }}>
      {children}
      {dim && (
        <div
          data-testid="sleep-schedule-overlay"
          aria-hidden="true"
          style={{
            position: "fixed",
            inset: 0,
            background: overlayColor,
            pointerEvents: "none",
            transition: "opacity 600ms ease",
            zIndex: 8000,
          }}
        />
      )}
    </div>
  );
}

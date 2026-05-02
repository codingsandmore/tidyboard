"use client";

import { useEffect, useState } from "react";
import { TB } from "@/lib/tokens";

export interface AmbientReminder {
  id: string;
  title: string;
  detail?: string;
}

export interface AmbientScreensaverProps {
  /** Reminders to slowly rotate through. */
  reminders?: AmbientReminder[];
  /**
   * How long each reminder is visible before rotating, in ms.
   * Default 12_000 (12s). Tests can lower this.
   */
  rotationMs?: number;
  /**
   * Optional click/tap handler — kiosk app shell uses this to exit ambient
   * mode and return to the active route.
   */
  onWake?: () => void;
  /**
   * Inject a clock value (testing). When omitted, the component reads
   * `Date.now()` once per second.
   */
  clock?: Date;
}

const AMBIENT_BG = "#0F0E0C";
const AMBIENT_TEXT = "#F5EFE6";
const AMBIENT_DIM = "rgba(245, 239, 230, 0.55)";

/**
 * AmbientScreensaver — full-screen idle-mode panel for the kiosk.
 *
 * Issue #88. Renders a large clock + date and slowly rotates through any
 * `reminders` (snooze/dismiss happen elsewhere — this view is read-only).
 *
 * The component is intentionally state-light so it renders cheaply when
 * the panel sits on for hours.
 */
export function AmbientScreensaver({
  reminders = [],
  rotationMs = 12_000,
  onWake,
  clock,
}: AmbientScreensaverProps) {
  const [now, setNow] = useState<Date>(clock ?? new Date());
  const [reminderIndex, setReminderIndex] = useState(0);

  // Tick clock every second. Skip when an explicit `clock` was injected.
  useEffect(() => {
    if (clock) {
      setNow(clock);
      return;
    }
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, [clock]);

  // Rotate reminders.
  useEffect(() => {
    if (reminders.length <= 1) return;
    const id = setInterval(() => {
      setReminderIndex((i) => (i + 1) % reminders.length);
    }, rotationMs);
    return () => clearInterval(id);
  }, [reminders.length, rotationMs]);

  const time = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(now);
  const date = new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(now);

  const current = reminders[reminderIndex];

  return (
    <div
      data-testid="ambient-screensaver"
      role="status"
      aria-label="Kiosk ambient mode"
      onClick={onWake}
      style={{
        position: "fixed",
        inset: 0,
        background: AMBIENT_BG,
        color: AMBIENT_TEXT,
        fontFamily: TB.fontDisplay,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 24,
        cursor: onWake ? "pointer" : "default",
        zIndex: 9000,
      }}
    >
      <div
        data-testid="ambient-clock"
        style={{
          fontSize: 180,
          lineHeight: 1,
          fontWeight: 300,
          letterSpacing: "-0.02em",
        }}
      >
        {time}
      </div>
      <div
        data-testid="ambient-date"
        style={{
          fontSize: 28,
          color: AMBIENT_DIM,
          letterSpacing: "0.02em",
        }}
      >
        {date}
      </div>

      {current ? (
        <div
          data-testid="ambient-reminder"
          style={{
            marginTop: 36,
            padding: "18px 28px",
            borderRadius: 18,
            border: `1px solid rgba(245, 239, 230, 0.18)`,
            maxWidth: 720,
            textAlign: "center",
            fontFamily: TB.fontBody,
          }}
        >
          <div style={{ fontSize: 22, fontWeight: 500 }}>{current.title}</div>
          {current.detail && (
            <div style={{ marginTop: 6, fontSize: 16, color: AMBIENT_DIM }}>
              {current.detail}
            </div>
          )}
        </div>
      ) : null}

      <div
        style={{
          position: "absolute",
          bottom: 28,
          fontSize: 12,
          color: AMBIENT_DIM,
          fontFamily: TB.fontMono,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
      >
        Tap to wake
      </div>
    </div>
  );
}

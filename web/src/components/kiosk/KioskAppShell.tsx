"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { useIdleTimeout } from "@/lib/use-idle-timeout";
import { AmbientScreensaver, type AmbientReminder } from "./AmbientScreensaver";
import { SleepSchedule } from "./SleepSchedule";
import { KioskLock } from "./KioskLock";

export interface KioskAppShellProps {
  /** Idle timeout in ms before ambient mode kicks in. Default 5 minutes. */
  idleMs?: number;
  /** Quiet-hours start, "HH:MM". Omit to disable sleep schedule. */
  quietStart?: string;
  /** Quiet-hours end, "HH:MM". */
  quietEnd?: string;
  /** Reminders to rotate through in ambient mode. */
  reminders?: AmbientReminder[];
  /**
   * Member ID required to escape kiosk mode (PIN gate). When present,
   * the ambient screensaver shows a `KioskLock` instead of waking
   * directly.
   */
  lockMemberId?: string;
  lockMemberName?: string;
  children: ReactNode;
}

/**
 * KioskAppShell — wires the ambient screensaver, sleep schedule, and
 * kiosk lock around an otherwise-normal kiosk page.
 *
 * Issue #88. Pages stay mounted under the screensaver so app state
 * (selected tab, scroll position, in-flight requests) is preserved when
 * ambient mode lifts.
 */
export function KioskAppShell({
  idleMs = 5 * 60_000,
  quietStart,
  quietEnd,
  reminders,
  lockMemberId,
  lockMemberName,
  children,
}: KioskAppShellProps) {
  const idle = useIdleTimeout(idleMs);
  const [unlocked, setUnlocked] = useState(false);
  const ambientActive = idle && !unlocked;

  const body = (
    <>
      {children}
      {ambientActive && (
        <>
          {lockMemberId ? (
            <div
              data-testid="kiosk-app-shell-lock-overlay"
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.85)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 9100,
              }}
            >
              <KioskLock
                memberId={lockMemberId}
                memberName={lockMemberName}
                onUnlock={() => setUnlocked(true)}
              />
            </div>
          ) : (
            <AmbientScreensaver
              reminders={reminders}
              onWake={() => setUnlocked(true)}
            />
          )}
        </>
      )}
    </>
  );

  if (quietStart && quietEnd) {
    return (
      <SleepSchedule start={quietStart} end={quietEnd}>
        {body}
      </SleepSchedule>
    );
  }
  return <>{body}</>;
}

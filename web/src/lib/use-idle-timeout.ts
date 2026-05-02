"use client";

import { useEffect, useState, useCallback, useRef } from "react";

/**
 * useIdleTimeout — returns `true` once the user has been idle for `ms`
 * milliseconds, resets to `false` on any user activity.
 *
 * Activity is detected via mousedown/mousemove/keydown/touchstart/scroll
 * on `window`. The timer is restarted whenever any of those events fire.
 *
 * Issue #88 — drives the kiosk ambient/screensaver mode.
 */
export function useIdleTimeout(ms: number): boolean {
  const [idle, setIdle] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reset = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setIdle(false);
    timerRef.current = setTimeout(() => setIdle(true), ms);
  }, [ms]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const events = [
      "mousedown",
      "mousemove",
      "keydown",
      "touchstart",
      "scroll",
      "wheel",
    ];
    reset();
    for (const ev of events) {
      window.addEventListener(ev, reset, { passive: true });
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      for (const ev of events) {
        window.removeEventListener(ev, reset);
      }
    };
  }, [reset]);

  return idle;
}

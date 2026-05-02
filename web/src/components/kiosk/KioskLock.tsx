"use client";

import { useState } from "react";
import { TB } from "@/lib/tokens";
import { useAuth } from "@/lib/auth/auth-store";

export interface KioskLockProps {
  /**
   * Member ID whose PIN is being entered. The kiosk lock is typically
   * configured with a single "kiosk admin" member so children cannot
   * unlock themselves.
   */
  memberId: string;
  /** Display name for the lock title. */
  memberName?: string;
  /** Called once `pinLogin` resolves successfully. */
  onUnlock: () => void;
  /**
   * Optional injection point for tests — when provided, this is called
   * instead of the auth store's `pinLogin`. Defaults to the real
   * `useAuth().pinLogin`, which POSTs `/v1/auth/pin`.
   */
  pinLoginFn?: (memberId: string, pin: string) => Promise<void>;
}

/**
 * KioskLock — PIN gate to escape kiosk mode. Issue #88.
 *
 * Wraps the existing `pinLogin` flow (POST /v1/auth/pin → uses the
 * `pin_hash` column on `members`). The component itself just collects
 * the PIN, calls the auth function, and surfaces success/failure.
 */
export function KioskLock({
  memberId,
  memberName,
  onUnlock,
  pinLoginFn,
}: KioskLockProps) {
  const auth = useAuth();
  const verify = pinLoginFn ?? auth.pinLogin;
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pin.length < 4) return;
    setLoading(true);
    setError(null);
    try {
      await verify(memberId, pin);
      onUnlock();
    } catch {
      setError("Incorrect PIN. Please try again.");
      setPin("");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      data-testid="kiosk-lock"
      onSubmit={handleSubmit}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        padding: 24,
        background: "#1C1917",
        color: "#fff",
        fontFamily: TB.fontBody,
        minHeight: 240,
        borderRadius: TB.r.lg,
      }}
    >
      <div style={{ fontFamily: TB.fontDisplay, fontSize: 22, fontWeight: 500 }}>
        {memberName ? `Unlock for ${memberName}` : "Enter adult PIN"}
      </div>
      <input
        data-testid="kiosk-lock-pin-input"
        aria-label="PIN"
        type="password"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        value={pin}
        onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
        disabled={loading}
        style={{
          width: 200,
          padding: "12px 16px",
          fontSize: 24,
          textAlign: "center",
          borderRadius: TB.r.md,
          border: "1px solid rgba(255,255,255,0.2)",
          background: "rgba(255,255,255,0.05)",
          color: "#fff",
          letterSpacing: "0.4em",
        }}
      />
      {error && (
        <div data-testid="kiosk-lock-error" style={{ color: TB.destructive, fontSize: 14 }}>
          {error}
        </div>
      )}
      <button
        type="submit"
        data-testid="kiosk-lock-submit"
        disabled={pin.length < 4 || loading}
        style={{
          padding: "12px 32px",
          borderRadius: 9999,
          background: pin.length >= 4 && !loading ? TB.primary : "rgba(255,255,255,0.1)",
          color: "#fff",
          fontSize: 16,
          fontWeight: 600,
          border: "none",
          cursor: pin.length >= 4 && !loading ? "pointer" : "default",
        }}
      >
        {loading ? "Verifying…" : "Unlock"}
      </button>
    </form>
  );
}

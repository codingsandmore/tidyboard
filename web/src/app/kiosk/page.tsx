"use client";

/**
 * /kiosk — canonical kiosk lock-screen entry point.
 *
 * Renders the same lock + member-picker + PIN flow as /lock.
 * Also handles ?member=<id> query param from the dashboard sidebar
 * to pre-select a member and go straight to PIN entry.
 *
 * This route is intentionally public (no AuthGate) so the tablet can
 * always reach the lock screen even when no member token exists.
 */

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { KioskLock } from "@/components/screens/routine";
import { useMembers } from "@/lib/api/hooks";
import { useAuth } from "@/lib/auth/auth-store";
import { TB } from "@/lib/tokens";
import { Icon } from "@/components/ui/icon";
import { useTranslations } from "next-intl";
import type { Member } from "@/lib/api/types";

type LockState = "lock" | "members" | "pin";

function KioskInner() {
  const searchParams = useSearchParams();
  const preSelectId = searchParams.get("member");
  const { data: members } = useMembers();

  const [state, setState] = useState<LockState>("lock");
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const router = useRouter();

  // If ?member= param is set, skip directly to PIN for that member
  useEffect(() => {
    if (!preSelectId || !members) return;
    const found = members.find((m) => m.id === preSelectId && m.role !== "pet");
    if (found) {
      setSelectedMember(found);
      setState("pin");
    }
  }, [preSelectId, members]);

  function handleLockClick() {
    setState("members");
  }

  function handleSelectMember(m: Member) {
    setSelectedMember(m);
    setState("pin");
  }

  function handlePinSuccess() {
    router.push("/");
  }

  function handleBack() {
    setSelectedMember(null);
    setState("members");
  }

  return (
    <div
      data-testid="lock-root"
      style={{ width: "100vw", height: "100vh", overflow: "hidden" }}
    >
      {state === "lock" && (
        <div
          style={{ width: "100%", height: "100%" }}
          onClick={handleLockClick}
          data-testid="lock-screen"
        >
          <KioskLock />
        </div>
      )}
      {state === "members" && (
        <MemberPicker onSelect={handleSelectMember} />
      )}
      {state === "pin" && selectedMember && (
        <PinModal
          member={selectedMember}
          onSuccess={handlePinSuccess}
          onBack={handleBack}
        />
      )}
    </div>
  );
}

export default function KioskPage() {
  return (
    <Suspense fallback={<div style={{ width: "100vw", height: "100vh", background: "#1C1917" }} />}>
      <KioskInner />
    </Suspense>
  );
}

// ─── Member Picker ────────────────────────────────────────────────────────────

function MemberPicker({ onSelect }: { onSelect: (m: Member) => void }) {
  const { data: members, isLoading } = useMembers();
  const loginMembers = members?.filter((member) => member.role !== "pet");
  const t = useTranslations("lock");

  return (
    <div
      data-testid="member-picker"
      style={{
        width: "100%",
        height: "100%",
        background: "#1C1917",
        color: "#fff",
        fontFamily: TB.fontBody,
        display: "flex",
        flexDirection: "column",
        padding: 32,
        boxSizing: "border-box",
      }}
    >
      <div style={{ textAlign: "center", marginBottom: 50 }}>
        <div style={{ fontFamily: TB.fontDisplay, fontSize: 48, fontWeight: 500 }}>
          {t("whosUsing")}
        </div>
        <div style={{ fontSize: 16, color: TB.muted, marginTop: 8 }}>
          {t("tapAvatar")}
        </div>
      </div>

      {isLoading && (
        <div style={{ textAlign: "center", color: TB.muted, fontSize: 16 }}>
          Loading…
        </div>
      )}

      {!isLoading && loginMembers && (
        <div
          style={{
            flex: 1,
            display: "grid",
            gridTemplateColumns: loginMembers.length <= 2 ? "repeat(2, 1fr)" : "repeat(3, 1fr)",
            gap: 32,
            alignItems: "center",
            justifyItems: "center",
          }}
        >
          {loginMembers.map((m) => (
            <button
              key={m.id}
              data-testid={`member-tile-${m.id}`}
              onClick={() => onSelect(m)}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 12,
                cursor: "pointer",
                background: "transparent",
                border: "none",
                padding: 0,
              }}
            >
              <div
                style={{
                  width: 120,
                  height: 120,
                  borderRadius: "50%",
                  background: m.color,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: TB.fontBody,
                  fontWeight: 600,
                  color: "#fff",
                  fontSize: 48,
                  boxShadow: `0 0 0 4px rgba(255,255,255,0.1), 0 20px 50px ${m.color}55`,
                }}
              >
                {m.initial}
              </div>
              <div style={{ fontSize: 20, fontWeight: 600, color: "#fff" }}>{m.name}</div>
              <div style={{ fontSize: 12, color: TB.muted }}>
                {m.role === "child" ? t("pinRequired") : t("enterPassword")}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── PIN Modal ────────────────────────────────────────────────────────────────

function PinModal({
  member,
  onSuccess,
  onBack,
}: {
  member: Member;
  onSuccess: () => void;
  onBack: () => void;
}) {
  const { pinLogin, setActiveMember } = useAuth();
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!pin.trim()) return;
    setError(null);
    setLoading(true);
    try {
      await pinLogin(member.id, pin);
      setActiveMember({
        id: member.id,
        name: member.name,
        role: member.role === "child" ? "child" : "adult",
      });
      onSuccess();
    } catch {
      setError("Incorrect PIN. Please try again.");
      setPin("");
    } finally {
      setLoading(false);
    }
  }

  function handleDigit(d: string) {
    if (pin.length < 6) setPin((p) => p + d);
  }

  function handleBackspace() {
    setPin((p) => p.slice(0, -1));
  }

  return (
    <div
      data-testid="pin-modal"
      style={{
        width: "100%",
        height: "100%",
        background: "#1C1917",
        color: "#fff",
        fontFamily: TB.fontBody,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 32,
        padding: 32,
        boxSizing: "border-box",
      }}
    >
      {/* Member avatar */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        <div
          style={{
            width: 96,
            height: 96,
            borderRadius: "50%",
            background: member.color,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 40,
            fontWeight: 700,
            color: "#fff",
            boxShadow: "0 0 0 4px rgba(255,255,255,0.15)",
          }}
        >
          {member.initial}
        </div>
        <div style={{ fontSize: 22, fontWeight: 600 }}>{member.name}</div>
      </div>

      {/* PIN dots */}
      <div style={{ display: "flex", gap: 16 }}>
        {Array.from({ length: 6 }, (_, i) => (
          <div
            key={i}
            style={{
              width: 16,
              height: 16,
              borderRadius: "50%",
              background: i < pin.length ? "#fff" : "rgba(255,255,255,0.2)",
              border: "2px solid rgba(255,255,255,0.3)",
              transition: "background 0.15s",
            }}
          />
        ))}
      </div>

      {/* Error */}
      {error && (
        <div style={{ color: TB.destructive, fontSize: 14, textAlign: "center" }}>
          {error}
        </div>
      )}

      {/* Numpad */}
      <form
        data-testid="pin-form"
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}
      >
        {[["1", "2", "3"], ["4", "5", "6"], ["7", "8", "9"], ["", "0", "⌫"]].map((row, ri) => (
          <div key={ri} style={{ display: "flex", gap: 12 }}>
            {row.map((d, di) => (
              <button
                key={di}
                type="button"
                disabled={d === "" || loading}
                onClick={
                  d === "⌫" ? handleBackspace : d !== "" ? () => handleDigit(d) : undefined
                }
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: "50%",
                  background: d === "" ? "transparent" : "rgba(255,255,255,0.08)",
                  border: d === "" ? "none" : "1px solid rgba(255,255,255,0.12)",
                  color: "#fff",
                  fontSize: d === "⌫" ? 22 : 28,
                  fontWeight: 500,
                  fontFamily: TB.fontDisplay,
                  cursor: d === "" ? "default" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "background 0.1s",
                }}
              >
                {d}
              </button>
            ))}
          </div>
        ))}

        <button
          type="submit"
          data-testid="pin-submit"
          disabled={pin.length < 4 || loading}
          style={{
            marginTop: 8,
            padding: "14px 48px",
            borderRadius: 9999,
            background: pin.length >= 4 ? member.color : "rgba(255,255,255,0.1)",
            color: "#fff",
            fontSize: 16,
            fontWeight: 600,
            border: "none",
            cursor: pin.length >= 4 && !loading ? "pointer" : "default",
            transition: "background 0.2s",
          }}
        >
          {loading ? "Verifying…" : "Unlock"}
        </button>
      </form>

      {/* Back button */}
      <button
        data-testid="pin-back"
        onClick={onBack}
        style={{
          background: "transparent",
          border: "none",
          color: TB.muted,
          cursor: "pointer",
          fontSize: 14,
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <Icon name="chevronL" size={14} color={TB.muted} /> Back
      </button>
    </div>
  );
}

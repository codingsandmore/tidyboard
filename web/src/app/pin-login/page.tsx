"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-store";
import { useMembers } from "@/lib/api/hooks";
import { TB } from "@/lib/tokens";
import type { Member } from "@/lib/api/types";
import { useTranslations } from "next-intl";

// ── Number pad ─────────────────────────────────────────────────────────────

function NumPad({ onDigit, onDelete }: { onDigit: (d: string) => void; onDelete: () => void }) {
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"];
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: 12,
        width: "100%",
        maxWidth: 240,
      }}
    >
      {keys.map((k, i) => (
        <button
          key={i}
          onClick={() => {
            if (k === "⌫") onDelete();
            else if (k) onDigit(k);
          }}
          disabled={!k}
          style={{
            height: 56,
            borderRadius: TB.r.lg,
            border: `1px solid ${TB.border}`,
            background: k ? TB.surface : "transparent",
            color: TB.text,
            fontSize: 20,
            fontWeight: 600,
            fontFamily: TB.fontBody,
            cursor: k ? "pointer" : "default",
            opacity: k ? 1 : 0,
          }}
        >
          {k}
        </button>
      ))}
    </div>
  );
}

// ── PIN entry overlay ──────────────────────────────────────────────────────

function PinEntry({
  member,
  onSuccess,
  onCancel,
}: {
  member: Member;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const { pinLogin } = useAuth();
  const t = useTranslations("auth");
  const [digits, setDigits] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const PIN_LENGTH = 4;

  async function handleDigit(d: string) {
    if (loading) return;
    const next = [...digits, d];
    setDigits(next);
    setError(null);

    if (next.length === PIN_LENGTH) {
      setLoading(true);
      try {
        await pinLogin(member.id, next.join(""));
        onSuccess();
      } catch (err: unknown) {
        const msg =
          err && typeof err === "object" && "message" in err
            ? String((err as { message: string }).message)
            : t("incorrectPin");
        setError(msg);
        setDigits([]);
      } finally {
        setLoading(false);
      }
    }
  }

  function handleDelete() {
    setDigits((prev) => prev.slice(0, -1));
    setError(null);
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
        padding: 24,
      }}
    >
      <div
        style={{
          background: TB.surface,
          borderRadius: TB.r.xl,
          padding: 32,
          width: "100%",
          maxWidth: 320,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 20,
        }}
      >
        {/* Avatar */}
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: "50%",
            background: member.color ?? TB.primary,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontSize: 28,
            fontWeight: 700,
          }}
        >
          {member.initial ?? member.name.charAt(0).toUpperCase()}
        </div>

        <div style={{ fontSize: 16, fontWeight: 600, color: TB.text }}>
          {member.full ?? member.name}
        </div>

        {/* PIN dots */}
        <div style={{ display: "flex", gap: 12 }}>
          {Array.from({ length: PIN_LENGTH }).map((_, i) => (
            <div
              key={i}
              style={{
                width: 14,
                height: 14,
                borderRadius: "50%",
                background: i < digits.length ? TB.primary : TB.border,
                transition: "background 0.15s",
              }}
            />
          ))}
        </div>

        {error && (
          <div
            role="alert"
            style={{ fontSize: 13, color: TB.destructive, textAlign: "center" }}
          >
            {error}
          </div>
        )}

        <NumPad onDigit={handleDigit} onDelete={handleDelete} />

        <button
          onClick={onCancel}
          style={{
            background: "transparent",
            border: "none",
            color: TB.text2,
            fontSize: 13,
            cursor: "pointer",
            padding: "4px 12px",
            fontFamily: TB.fontBody,
          }}
        >
          {t("cancel")}
        </button>
      </div>
    </div>
  );
}

// ── Avatar grid ────────────────────────────────────────────────────────────

function MemberAvatar({
  member,
  onSelect,
}: {
  member: Member;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 10,
        background: "transparent",
        border: "none",
        cursor: "pointer",
        padding: 8,
        borderRadius: TB.r.lg,
        fontFamily: TB.fontBody,
      }}
    >
      <div
        style={{
          width: 80,
          height: 80,
          borderRadius: "50%",
          background: member.color ?? TB.primary,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          fontSize: 32,
          fontWeight: 700,
          boxShadow: TB.shadow,
        }}
      >
        {member.initial ?? member.name.charAt(0).toUpperCase()}
      </div>
      <span style={{ fontSize: 13, fontWeight: 550, color: TB.text }}>
        {member.full ?? member.name}
      </span>
    </button>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function PinLoginPage() {
  const router = useRouter();
  const t = useTranslations("auth");
  const { data: members, isLoading } = useMembers();
  const loginMembers = members?.filter((member) => member.role !== "pet");
  const [selected, setSelected] = useState<Member | null>(null);

  function handleSuccess() {
    router.push("/");
  }

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        background: TB.bg,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: TB.fontBody,
        padding: 24,
        boxSizing: "border-box",
      }}
    >
      {/* Logo */}
      <div
        style={{
          fontFamily: TB.fontDisplay,
          fontSize: 26,
          fontWeight: 600,
          color: TB.primary,
          letterSpacing: "-0.02em",
          marginBottom: 8,
        }}
      >
        tidyboard
      </div>
      <div style={{ fontSize: 14, color: TB.text2, marginBottom: 40 }}>
        {t("whosUsing")}
      </div>

      {isLoading && (
        <div style={{ color: TB.text2, fontSize: 14 }}>{t("loadingMembers")}</div>
      )}

      {!isLoading && loginMembers && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 16,
            justifyContent: "center",
            maxWidth: 480,
          }}
        >
          {loginMembers.map((m) => (
            <MemberAvatar key={m.id} member={m} onSelect={() => setSelected(m)} />
          ))}
        </div>
      )}

      <a
        href="/login"
        style={{
          marginTop: 40,
          fontSize: 13,
          color: TB.text2,
          textDecoration: "none",
        }}
      >
        {t("signInWithEmail")}
      </a>

      {selected && (
        <PinEntry
          member={selected}
          onSuccess={handleSuccess}
          onCancel={() => setSelected(null)}
        />
      )}
    </div>
  );
}

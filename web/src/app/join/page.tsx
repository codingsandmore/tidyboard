"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TB } from "@/lib/tokens";
import { useHouseholdByCode, useRequestJoin } from "@/lib/api/hooks";

type JoinState = "idle" | "previewing" | "requested" | "error";

export default function JoinPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [submittedCode, setSubmittedCode] = useState("");
  const [state, setState] = useState<JoinState>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Only fetch when submittedCode has 8 chars
  const {
    data: preview,
    isLoading: previewLoading,
    error: previewError,
  } = useHouseholdByCode(submittedCode);

  const requestJoin = useRequestJoin();

  function handleLookup(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length !== 8) {
      setErrorMsg("Invite codes are 8 characters.");
      return;
    }
    setErrorMsg(null);
    setSubmittedCode(trimmed);
    setState("previewing");
  }

  async function handleJoin() {
    if (!submittedCode) return;
    setErrorMsg(null);
    try {
      await requestJoin.mutateAsync(submittedCode);
      setState("requested");
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Failed to send join request.";
      setErrorMsg(msg);
      setState("error");
    }
  }

  const containerStyle: React.CSSProperties = {
    width: "100vw",
    height: "100vh",
    background: TB.bg,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: TB.fontBody,
    padding: 24,
  };

  const cardStyle: React.CSSProperties = {
    background: TB.surface,
    borderRadius: TB.r.lg,
    padding: 32,
    width: "100%",
    maxWidth: 400,
    display: "flex",
    flexDirection: "column",
    gap: 20,
    boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
  };

  const inputStyle: React.CSSProperties = {
    padding: "10px 14px",
    borderRadius: TB.r.md,
    border: `1px solid ${TB.border}`,
    fontFamily: TB.fontBody,
    fontSize: 20,
    fontWeight: 700,
    letterSpacing: "0.2em",
    background: TB.bg,
    color: TB.text,
    width: "100%",
    boxSizing: "border-box",
    textAlign: "center",
    textTransform: "uppercase",
  };

  const btnPrimary: React.CSSProperties = {
    padding: "10px 20px",
    borderRadius: TB.r.md,
    border: "none",
    background: TB.primary,
    color: TB.primaryFg,
    cursor: "pointer",
    fontFamily: TB.fontBody,
    fontSize: 14,
    fontWeight: 600,
    width: "100%",
  };

  const btnSecondary: React.CSSProperties = {
    padding: "10px 20px",
    borderRadius: TB.r.md,
    border: `1px solid ${TB.border}`,
    background: "transparent",
    color: TB.text2,
    cursor: "pointer",
    fontFamily: TB.fontBody,
    fontSize: 14,
    width: "100%",
  };

  // "Waiting for approval" state
  if (state === "requested") {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⏳</div>
            <div style={{ fontWeight: 700, fontSize: 18, color: TB.text, marginBottom: 8 }}>
              Request sent!
            </div>
            <div style={{ fontSize: 14, color: TB.text2, lineHeight: 1.6 }}>
              Your join request has been sent to the household owner. You&apos;ll
              be added once they approve it.
            </div>
          </div>
          <button
            onClick={() => router.push("/")}
            style={btnSecondary}
          >
            Back to home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 20, color: TB.text, marginBottom: 6 }}>
            Join a household
          </div>
          <div style={{ fontSize: 13, color: TB.text2, lineHeight: 1.5 }}>
            Enter the 8-character invite code you received from your household owner.
          </div>
        </div>

        {/* Code entry form */}
        <form onSubmit={handleLookup} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input
            data-testid="invite-code-input"
            type="text"
            placeholder="ABCD1234"
            maxLength={8}
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase());
              setSubmittedCode("");
              setState("idle");
              setErrorMsg(null);
            }}
            style={inputStyle}
            autoComplete="off"
            spellCheck={false}
          />
          <button
            type="submit"
            disabled={code.trim().length !== 8}
            style={{
              ...btnPrimary,
              background: code.trim().length !== 8 ? TB.bg2 : TB.primary,
              color: code.trim().length !== 8 ? TB.muted : TB.primaryFg,
              cursor: code.trim().length !== 8 ? "default" : "pointer",
            }}
          >
            Look up household
          </button>
        </form>

        {/* Preview */}
        {state === "previewing" && (
          <div>
            {previewLoading && (
              <div style={{ color: TB.muted, fontSize: 13 }}>Looking up household…</div>
            )}
            {previewError && (
              <div style={{ color: TB.destructive, fontSize: 13 }}>
                Household not found. Check the code and try again.
              </div>
            )}
            {preview && !previewLoading && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div
                  style={{
                    padding: "12px 16px",
                    background: TB.bg2,
                    borderRadius: TB.r.md,
                    border: `1px solid ${TB.border}`,
                  }}
                >
                  <div style={{ fontSize: 11, color: TB.text2, marginBottom: 4 }}>
                    You&apos;re joining
                  </div>
                  <div
                    data-testid="household-preview-name"
                    style={{ fontWeight: 700, fontSize: 16, color: TB.text }}
                  >
                    {preview.name}
                  </div>
                </div>
                <button
                  data-testid="request-join-btn"
                  onClick={handleJoin}
                  disabled={requestJoin.isPending}
                  style={{
                    ...btnPrimary,
                    cursor: requestJoin.isPending ? "wait" : "pointer",
                  }}
                >
                  {requestJoin.isPending ? "Sending request…" : "Request to join"}
                </button>
              </div>
            )}
          </div>
        )}

        {errorMsg && (
          <div
            role="alert"
            style={{ fontSize: 13, color: TB.destructive }}
          >
            {errorMsg}
          </div>
        )}

        <button
          onClick={() => router.push("/")}
          style={btnSecondary}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

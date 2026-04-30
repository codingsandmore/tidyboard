"use client";

import { useState } from "react";
import { TB } from "@/lib/tokens";
import {
  useHousehold,
  useRegenerateInviteCode,
  useJoinRequests,
  useApproveJoinRequest,
  useRejectJoinRequest,
} from "@/lib/api/hooks";

interface InviteModalProps {
  householdId: string;
  onClose: () => void;
}

export function InviteModal({ householdId, onClose }: InviteModalProps) {
  const { data: hh, isLoading } = useHousehold(householdId);
  const regenerate = useRegenerateInviteCode();
  const { data: joinRequests, isLoading: jrLoading } = useJoinRequests(householdId);
  const approve = useApproveJoinRequest();
  const reject = useRejectJoinRequest();

  const [copied, setCopied] = useState(false);
  const [regenError, setRegenError] = useState<string | null>(null);

  const inviteCode = hh?.invite_code ?? "";

  async function handleRegenerate() {
    setRegenError(null);
    try {
      await regenerate.mutateAsync(householdId);
    } catch {
      setRegenError("Failed to regenerate code.");
    }
  }

  async function handleCopy() {
    if (!inviteCode) return;
    try {
      await navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: select text
    }
  }

  async function handleApprove(requestId: string) {
    await approve.mutateAsync({ requestId, householdId });
  }

  async function handleReject(requestId: string) {
    await reject.mutateAsync({ requestId, householdId });
  }

  const overlayStyle: React.CSSProperties = {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.45)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: 16,
  };

  const modalStyle: React.CSSProperties = {
    background: TB.surface,
    borderRadius: TB.r.lg,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    fontFamily: TB.fontBody,
    display: "flex",
    flexDirection: "column",
    gap: 16,
    boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
  };

  const inputStyle: React.CSSProperties = {
    padding: "8px 12px",
    borderRadius: TB.r.md,
    border: `1px solid ${TB.border}`,
    fontFamily: TB.fontBody,
    fontSize: 20,
    fontWeight: 700,
    letterSpacing: "0.2em",
    background: TB.bg2,
    color: TB.text,
    width: "100%",
    boxSizing: "border-box",
    textAlign: "center",
  };

  const btnPrimary: React.CSSProperties = {
    padding: "7px 16px",
    borderRadius: TB.r.md,
    border: "none",
    background: TB.primary,
    color: TB.primaryFg,
    cursor: "pointer",
    fontFamily: TB.fontBody,
    fontSize: 13,
    fontWeight: 600,
  };

  const btnSecondary: React.CSSProperties = {
    padding: "7px 16px",
    borderRadius: TB.r.md,
    border: `1px solid ${TB.border}`,
    background: "transparent",
    color: TB.text2,
    cursor: "pointer",
    fontFamily: TB.fontBody,
    fontSize: 13,
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center" }}>
          <span style={{ flex: 1, fontWeight: 600, fontSize: 15, color: TB.text }}>
            Invite a Partner
          </span>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: TB.text2,
              fontSize: 18,
              lineHeight: 1,
              padding: "0 4px",
            }}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Instructions */}
        <div style={{ fontSize: 13, color: TB.text2, lineHeight: 1.5 }}>
          Share this code with your partner. They can enter it on the{" "}
          <strong>/join</strong> page to request access. You&apos;ll approve
          their request here.
        </div>

        {/* Code display */}
        {isLoading ? (
          <div style={{ color: TB.muted, fontSize: 13 }}>Loading…</div>
        ) : (
          <div>
            <div style={{ fontSize: 11, color: TB.text2, marginBottom: 6 }}>
              Invite code
            </div>
            <input
              readOnly
              value={inviteCode}
              style={inputStyle}
              data-testid="invite-code-display"
            />
          </div>
        )}

        {regenError && (
          <div style={{ fontSize: 12, color: TB.destructive }}>{regenError}</div>
        )}

        {/* Actions */}
        <div style={{ display: "flex", gap: 8 }}>
          <button
            data-testid="copy-invite-code-btn"
            onClick={handleCopy}
            disabled={!inviteCode}
            style={btnPrimary}
          >
            {copied ? "Copied!" : "Copy Code"}
          </button>
          <button
            data-testid="regenerate-invite-code-btn"
            onClick={handleRegenerate}
            disabled={regenerate.isPending}
            style={btnSecondary}
          >
            {regenerate.isPending ? "Regenerating…" : "Regenerate"}
          </button>
        </div>

        {/* Pending join requests */}
        <div>
          <div
            style={{
              fontWeight: 600,
              fontSize: 13,
              color: TB.text,
              marginBottom: 8,
              borderTop: `1px solid ${TB.border}`,
              paddingTop: 12,
            }}
          >
            Pending Join Requests
          </div>

          {jrLoading && (
            <div style={{ color: TB.muted, fontSize: 12 }}>Loading…</div>
          )}

          {!jrLoading && (!joinRequests || joinRequests.length === 0) && (
            <div style={{ color: TB.muted, fontSize: 12 }}>
              No pending requests.
            </div>
          )}

          {joinRequests && joinRequests.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {joinRequests.map((jr) => (
                <div
                  key={jr.id}
                  data-testid={`join-request-${jr.id}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 10px",
                    background: TB.bg2,
                    borderRadius: TB.r.md,
                  }}
                >
                  <span style={{ flex: 1, fontSize: 12, color: TB.text2, wordBreak: "break-all" }}>
                    {jr.account_id}
                  </span>
                  <button
                    data-testid={`approve-${jr.id}`}
                    onClick={() => handleApprove(jr.id)}
                    disabled={approve.isPending}
                    style={{
                      ...btnPrimary,
                      padding: "4px 10px",
                      fontSize: 12,
                    }}
                  >
                    Approve
                  </button>
                  <button
                    data-testid={`reject-${jr.id}`}
                    onClick={() => handleReject(jr.id)}
                    disabled={reject.isPending}
                    style={{
                      ...btnSecondary,
                      padding: "4px 10px",
                      fontSize: 12,
                      border: `1px solid ${TB.destructive}`,
                      color: TB.destructive,
                    }}
                  >
                    Reject
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Close */}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button onClick={onClose} style={btnSecondary}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

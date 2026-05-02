"use client";

import type { CSSProperties } from "react";
import { TB } from "@/lib/tokens";
import { useSystemHealth, type SystemStatus } from "@/lib/api/health";

const LABEL: Record<SystemStatus, string> = {
  healthy: "Systems normal",
  degraded: "Service degraded",
  down: "Backend unreachable",
  unknown: "Checking…",
};

function colorFor(status: SystemStatus): string {
  switch (status) {
    case "healthy":
      return TB.success;
    case "degraded":
      return TB.warning;
    case "down":
      return TB.destructive;
    case "unknown":
    default:
      return TB.text2;
  }
}

const dotStyle: (color: string) => CSSProperties = (color) => ({
  width: 8,
  height: 8,
  borderRadius: 9999,
  background: color,
  boxShadow: `0 0 0 3px ${color}22`,
  flex: "0 0 auto",
});

const pillStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "4px 10px",
  borderRadius: 9999,
  border: `1px solid ${TB.border}`,
  background: TB.surface,
  color: TB.text,
  fontFamily: TB.fontBody,
  fontSize: 12,
  fontWeight: 500,
  lineHeight: 1,
  cursor: "default",
};

const buttonStyle: CSSProperties = {
  ...pillStyle,
  cursor: "pointer",
};

const panelStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  padding: 10,
  borderRadius: TB.r.sm,
  border: `1px solid ${TB.border}`,
  background: TB.bg2,
  fontFamily: TB.fontBody,
  fontSize: 12,
  color: TB.text,
};

const checkRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
};

/**
 * Compact status pill — shows a colored dot + short label.
 * Polls `/health` and `/ready` via useSystemHealth; safe to mount in
 * any client tree that's wrapped in `<ApiProvider/>`.
 */
export function SystemStatusBadge({
  onClick,
}: {
  onClick?: () => void;
}) {
  const { status } = useSystemHealth();
  const color = colorFor(status);
  const label = LABEL[status];

  if (onClick) {
    return (
      <button
        type="button"
        data-testid="system-status-badge"
        data-status={status}
        onClick={onClick}
        style={buttonStyle}
        aria-label={label}
      >
        <span style={dotStyle(color)} aria-hidden />
        {label}
      </button>
    );
  }

  return (
    <span
      data-testid="system-status-badge"
      data-status={status}
      style={pillStyle}
      role="status"
      aria-live="polite"
    >
      <span style={dotStyle(color)} aria-hidden />
      {label}
    </span>
  );
}

/**
 * Detailed status panel — surfaces per-subsystem readiness checks plus
 * version / last-checked timestamp. Renders inline alongside an error
 * UI so the user can tell "API up, DB sad" apart from "everything is on
 * fire".
 */
export function SystemStatusPanel() {
  const { status, version, failures, checks, lastCheckedAt, refetch, isFetching } =
    useSystemHealth();
  const color = colorFor(status);
  const label = LABEL[status];

  const checkEntries = Object.entries(checks);

  return (
    <div data-testid="system-status-panel" data-status={status} style={panelStyle}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={dotStyle(color)} aria-hidden />
        <strong style={{ fontWeight: 600 }}>{label}</strong>
        <button
          type="button"
          onClick={refetch}
          disabled={isFetching}
          data-testid="system-status-refresh"
          style={{
            marginLeft: "auto",
            border: `1px solid ${TB.border}`,
            background: TB.surface,
            color: TB.text,
            borderRadius: TB.r.sm,
            padding: "2px 8px",
            fontSize: 11,
            cursor: isFetching ? "default" : "pointer",
            opacity: isFetching ? 0.6 : 1,
          }}
        >
          {isFetching ? "Checking…" : "Recheck"}
        </button>
      </div>

      {checkEntries.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {checkEntries.map(([name, value]) => {
            const failed = failures.includes(name) || value !== "ok";
            return (
              <div key={name} style={checkRowStyle} data-testid={`system-status-check-${name}`}>
                <span style={{ color: TB.text2, fontFamily: TB.fontMono }}>
                  {name}
                </span>
                <span
                  style={{
                    color: failed ? TB.destructive : TB.success,
                    fontFamily: TB.fontMono,
                  }}
                >
                  {value}
                </span>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ color: TB.text2, fontSize: 11, fontFamily: TB.fontMono }}>
        {version ? `version ${version}` : null}
        {version && lastCheckedAt ? " · " : null}
        {lastCheckedAt ? `checked ${formatTime(lastCheckedAt)}` : null}
      </div>
    </div>
  );
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString();
  } catch {
    return iso;
  }
}

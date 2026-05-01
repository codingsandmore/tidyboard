"use client";

import { useState, type CSSProperties } from "react";
import { TB } from "@/lib/tokens";
import type { ApiError } from "@/lib/api/types";

/**
 * <ErrorAlert/> — surfaces an ApiError (or any thrown value) with full
 * end-to-end debug context: HTTP status, error code, message, request-id,
 * request url+method, and an optional collapsible stack trace.
 *
 * Always exposes a "Copy details" button that writes the full error JSON to
 * the clipboard so users can paste it into bug reports / support tickets.
 *
 * Renders gracefully for non-ApiError inputs (raw Error, string, null).
 */

type AnyRecord = Record<string, unknown>;

function isApiError(e: unknown): e is ApiError {
  if (!e || typeof e !== "object") return false;
  const r = e as AnyRecord;
  return (
    typeof r.code === "string" &&
    typeof r.message === "string" &&
    typeof r.status === "number" &&
    typeof r.url === "string" &&
    typeof r.method === "string"
  );
}

function describe(e: unknown): {
  status?: number;
  code?: string;
  message: string;
  requestId?: string;
  url?: string;
  method?: string;
  stack?: string;
  payload: unknown;
} {
  if (isApiError(e)) {
    return {
      status: e.status,
      code: e.code,
      message: e.message,
      requestId: e.requestId,
      url: e.url,
      method: e.method,
      stack: e.stack,
      payload: e,
    };
  }
  if (e instanceof Error) {
    return {
      message: e.message || e.name || "Error",
      stack: e.stack,
      payload: { name: e.name, message: e.message, stack: e.stack },
    };
  }
  if (typeof e === "string") {
    return { message: e, payload: { message: e } };
  }
  if (e === null || e === undefined) {
    return { message: "Unknown error", payload: { message: "Unknown error" } };
  }
  // Generic object — try to stringify for the copy button, render best-effort.
  const r = e as AnyRecord;
  const message =
    typeof r.message === "string" ? r.message : "Unknown error";
  return { message, payload: e };
}

const wrapStyle: CSSProperties = {
  border: `1px solid ${TB.destructive}40`,
  background: `${TB.destructive}0A`,
  borderRadius: TB.r.md,
  padding: 16,
  fontFamily: TB.fontBody,
  color: TB.text,
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

const headRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "baseline",
  flexWrap: "wrap",
  gap: 8,
};

const statusBadgeStyle: CSSProperties = {
  fontFamily: TB.fontMono,
  fontSize: 12,
  fontWeight: 600,
  padding: "2px 8px",
  borderRadius: 9999,
  background: `${TB.destructive}20`,
  color: TB.destructive,
  border: `1px solid ${TB.destructive}40`,
};

const codeStyle: CSSProperties = {
  fontFamily: TB.fontMono,
  fontSize: 12,
  color: TB.text2,
};

const messageStyle: CSSProperties = {
  fontSize: 15,
  fontWeight: 500,
  color: TB.text,
};

const metaRowStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 12,
  fontFamily: TB.fontMono,
  fontSize: 11,
  color: TB.text2,
};

const detailsStyle: CSSProperties = {
  fontFamily: TB.fontMono,
  fontSize: 11,
  color: TB.text2,
  background: TB.bg2,
  borderRadius: TB.r.sm,
  padding: 8,
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
  maxHeight: 200,
  overflow: "auto",
};

const buttonRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
};

const copyBtnStyle: CSSProperties = {
  height: 28,
  padding: "0 12px",
  fontFamily: TB.fontBody,
  fontSize: 12,
  fontWeight: 550,
  background: TB.surface,
  color: TB.text,
  border: `1px solid ${TB.border}`,
  borderRadius: TB.r.sm,
  cursor: "pointer",
};

export interface ErrorAlertProps {
  error: ApiError | unknown;
  /** Optional class for callers using utility CSS. */
  className?: string;
  style?: CSSProperties;
}

export function ErrorAlert({ error, className, style }: ErrorAlertProps) {
  const [copied, setCopied] = useState(false);
  const d = describe(error);

  const fullJson = (() => {
    try {
      return JSON.stringify(d.payload, null, 2);
    } catch {
      return String(d.payload);
    }
  })();

  async function handleCopy() {
    try {
      await navigator.clipboard?.writeText?.(fullJson);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard unavailable (older browsers / non-https). Silently no-op;
      // the JSON is still visible in the <details> block.
    }
  }

  return (
    <div
      role="alert"
      data-testid="error-alert"
      className={className}
      style={{ ...wrapStyle, ...style }}
    >
      <div style={headRowStyle}>
        {d.status !== undefined && (
          <span data-testid="error-alert-status" style={statusBadgeStyle}>
            {d.status}
          </span>
        )}
        {d.code && (
          <span data-testid="error-alert-code" style={codeStyle}>
            {d.code}
          </span>
        )}
      </div>

      <div data-testid="error-alert-message" style={messageStyle}>
        {d.message}
      </div>

      {(d.method || d.url || d.requestId) && (
        <div style={metaRowStyle}>
          {d.method && (
            <span data-testid="error-alert-method">{d.method}</span>
          )}
          {d.url && <span data-testid="error-alert-url">{d.url}</span>}
          {d.requestId && (
            <span data-testid="error-alert-request-id">
              req-id: {d.requestId}
            </span>
          )}
        </div>
      )}

      {d.stack && (
        <details data-testid="error-alert-stack">
          <summary style={{ cursor: "pointer", fontSize: 12, color: TB.text2 }}>
            Stack trace
          </summary>
          <pre style={detailsStyle}>{d.stack}</pre>
        </details>
      )}

      <div style={buttonRowStyle}>
        <button
          type="button"
          data-testid="error-alert-copy"
          onClick={handleCopy}
          style={copyBtnStyle}
        >
          {copied ? "Copied" : "Copy details"}
        </button>
      </div>
    </div>
  );
}

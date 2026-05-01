"use client";

import { useRef, useState, type CSSProperties } from "react";
import { TB } from "@/lib/tokens";
import type { ApiError } from "@/lib/api/types";
import { api } from "@/lib/api/client";
import type { ReportBugResponse } from "@/lib/api/hooks";
import { useAuth } from "@/lib/auth/auth-store";

/**
 * <ErrorAlert/> — surfaces an ApiError (or any thrown value) with full
 * end-to-end debug context: HTTP status, error code, message, request-id,
 * request url+method, and an optional collapsible stack trace.
 *
 * Always exposes a "Copy details" button that writes the full error JSON to
 * the clipboard so users can paste it into bug reports / support tickets.
 *
 * Also exposes a "Report to GitHub" button (#140) that POSTs to
 * `/v1/bug-reports`; on success surfaces the resulting issue number; on
 * failure opens a prefilled `github.com/codingsandmore/tidyboard/issues/new`
 * page in a new tab so the user can still file the bug. The button is
 * client-side rate-limited to ≤ 1 click per 60s per browser session.
 *
 * Renders gracefully for non-ApiError inputs (raw Error, string, null).
 */

const REPORT_COOLDOWN_MS = 60_000;
const GITHUB_NEW_ISSUE_URL =
  "https://github.com/codingsandmore/tidyboard/issues/new";

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
  flexWrap: "wrap",
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

const reportBtnStyle: CSSProperties = {
  ...copyBtnStyle,
};

const reportBtnDisabledStyle: CSSProperties = {
  ...reportBtnStyle,
  opacity: 0.6,
  cursor: "not-allowed",
};

const toastStyle: CSSProperties = {
  fontSize: 12,
  color: TB.text2,
};

export interface ErrorAlertProps {
  error: ApiError | unknown;
  /** Optional class for callers using utility CSS. */
  className?: string;
  style?: CSSProperties;
}

/**
 * Try to read the active member name without forcing every consumer to wrap
 * the alert in <AuthProvider>. Falls back to "" if the hook throws (e.g. the
 * alert renders outside any provider, in early-boot error screens).
 */
function useActiveMemberName(): string {
  try {
    const auth = useAuth();
    return auth?.activeMember?.name ?? "";
  } catch {
    return "";
  }
}

export function ErrorAlert({ error, className, style }: ErrorAlertProps) {
  const [copied, setCopied] = useState(false);
  const [reportToast, setReportToast] = useState<
    | { kind: "success"; issueNumber: number; issueUrl: string }
    | { kind: "error"; message: string }
    | null
  >(null);
  const [reportDisabled, setReportDisabled] = useState(false);
  const cooldownTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inflight = useRef(false);

  const memberName = useActiveMemberName();

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

  function startCooldown() {
    setReportDisabled(true);
    if (cooldownTimer.current) clearTimeout(cooldownTimer.current);
    cooldownTimer.current = setTimeout(() => {
      setReportDisabled(false);
    }, REPORT_COOLDOWN_MS);
  }

  function openFallbackIssue() {
    const title = encodeURIComponent(
      `[bug] ${d.code ? `${d.code}: ` : ""}${d.message}`.slice(0, 200)
    );
    const bodyParts = [
      "**Auto-filled by ErrorAlert because /v1/bug-reports was unreachable.**",
      "",
      "### Error",
      "```json",
      fullJson,
      "```",
      "",
      `**Page:** ${typeof window !== "undefined" ? window.location.href : ""}`,
      `**Member:** ${memberName || "(none)"}`,
      `**User-Agent:** ${typeof navigator !== "undefined" ? navigator.userAgent : ""}`,
    ];
    const body = encodeURIComponent(bodyParts.join("\n"));
    const url = `${GITHUB_NEW_ISSUE_URL}?title=${title}&body=${body}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function handleReport() {
    if (reportDisabled || inflight.current) return;
    inflight.current = true;
    startCooldown();
    try {
      const res = await api.post<ReportBugResponse>("/v1/bug-reports", {
        error: d.payload,
        url: typeof window !== "undefined" ? window.location.href : "",
        user_agent:
          typeof navigator !== "undefined" ? navigator.userAgent : "",
        member_name: memberName,
      });
      setReportToast({
        kind: "success",
        issueNumber: res.issue_number,
        issueUrl: res.issue_url,
      });
    } catch (e) {
      setReportToast({
        kind: "error",
        message:
          e instanceof Error ? e.message : "Failed to file bug report",
      });
      openFallbackIssue();
    } finally {
      inflight.current = false;
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

        <button
          type="button"
          data-testid="error-alert-report-github"
          onClick={handleReport}
          disabled={reportDisabled}
          style={reportDisabled ? reportBtnDisabledStyle : reportBtnStyle}
        >
          Report to GitHub
        </button>

        {reportToast?.kind === "success" && (
          <span data-testid="error-alert-report-toast" style={toastStyle}>
            Reported as{" "}
            <a
              data-testid="error-alert-report-toast-link"
              href={reportToast.issueUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: TB.text, textDecoration: "underline" }}
            >
              #{reportToast.issueNumber}
            </a>
          </span>
        )}
        {reportToast?.kind === "error" && (
          <span data-testid="error-alert-report-toast" style={toastStyle}>
            Could not file bug — opened GitHub in a new tab.
          </span>
        )}
      </div>
    </div>
  );
}

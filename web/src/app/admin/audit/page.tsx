"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { AuthGate } from "@/components/auth-gate";
import { AdminGate } from "@/components/admin-gate";
import { useAudit } from "@/lib/api/hooks";
import { TB } from "@/lib/tokens";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";
import type { AuditEntry } from "@/lib/api/types";

// ── Constants ─────────────────────────────────────────────────────────────────

const LIMIT = 50;

const ACTION_COLORS: Record<string, string> = {
  "event.create": TB.success,
  "event.update": TB.primary,
  "event.delete": TB.destructive,
  "list.create": TB.success,
  "list.update": TB.primary,
  "list.delete": TB.destructive,
  "member.create": TB.success,
  "member.update": TB.primary,
  "member.delete": TB.destructive,
  "household.update": TB.secondary,
  "recipe.create": TB.success,
  "recipe.update": TB.primary,
  "recipe.delete": TB.destructive,
  "backup.create": TB.accent,
  "subscription.update": TB.warning,
};

function actionColor(action: string): string {
  return ACTION_COLORS[action] ?? TB.muted;
}

// ── Date range helpers ────────────────────────────────────────────────────────

type DatePreset = "1h" | "24h" | "7d" | "30d" | "custom";

function presetToRange(preset: DatePreset | ""): { from: string; to: string } | undefined {
  if (!preset || preset === "custom") return undefined;
  const now = new Date();
  const to = now.toISOString();
  const ms: Record<Exclude<DatePreset, "custom">, number> = {
    "1h": 60 * 60 * 1000,
    "24h": 24 * 60 * 60 * 1000,
    "7d": 7 * 24 * 60 * 60 * 1000,
    "30d": 30 * 24 * 60 * 60 * 1000,
  };
  return { from: new Date(now.getTime() - ms[preset as Exclude<DatePreset, "custom">]).toISOString(), to };
}

// ── Relative time ─────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function fmtAbsolute(iso: string): string {
  return new Date(iso).toLocaleString();
}

// ── CSV export ────────────────────────────────────────────────────────────────

function exportCsv(entries: AuditEntry[], filename = "audit-log.csv"): void {
  const headers = [
    "id", "account_id", "household_id", "action", "target_type",
    "target_id", "ip_address", "user_agent", "created_at", "diff",
  ];
  const escape = (v: unknown): string => {
    const s = v == null ? "" : String(v);
    return `"${s.replace(/"/g, '""')}"`;
  };
  const rows = entries.map((e) =>
    [
      e.id, e.account_id, e.household_id ?? "", e.action, e.target_type,
      e.target_id, e.ip_address ?? "", e.user_agent ?? "", e.created_at,
      JSON.stringify(e.diff),
    ].map(escape).join(",")
  );
  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Row component ─────────────────────────────────────────────────────────────

function AuditRow({ entry, isMobile }: { entry: AuditEntry; isMobile: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const t = useTranslations("admin.audit");

  const targetTail = entry.target_id.length > 8
    ? "…" + entry.target_id.slice(-8)
    : entry.target_id;

  const uaTruncated = entry.user_agent
    ? entry.user_agent.length > 40
      ? entry.user_agent.slice(0, 40) + "…"
      : entry.user_agent
    : "—";

  if (isMobile) {
    return (
      <div
        style={{
          background: TB.surface,
          border: `1px solid ${TB.border}`,
          borderRadius: TB.r.lg,
          padding: "12px 14px",
          marginBottom: 8,
          fontFamily: TB.fontBody,
          fontSize: 13,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <Badge color={actionColor(entry.action)}>{entry.action}</Badge>
          <span style={{ color: TB.text2, fontSize: 11 }} title={fmtAbsolute(entry.created_at)}>
            {relativeTime(entry.created_at)}
          </span>
        </div>
        <div style={{ color: TB.text2, fontSize: 12, marginBottom: 4 }}>
          {entry.target_type} · {targetTail}
        </div>
        <div style={{ color: TB.muted, fontSize: 11, marginBottom: 4 }}>
          {entry.ip_address ?? "—"} · {uaTruncated}
        </div>
        <button
          onClick={() => setExpanded((p) => !p)}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: TB.primary,
            fontSize: 12,
            padding: 0,
            fontFamily: TB.fontBody,
          }}
        >
          {expanded ? t("diffCollapse") : t("diffExpand")}
        </button>
        {expanded && (
          <pre
            data-testid={`diff-${entry.id}`}
            style={{
              marginTop: 8,
              padding: "8px 10px",
              background: TB.bg2,
              borderRadius: TB.r.sm,
              fontSize: 11,
              fontFamily: TB.fontMono,
              overflow: "auto",
              whiteSpace: "pre-wrap",
              wordBreak: "break-all",
            }}
          >
            {JSON.stringify(entry.diff, null, 2)}
          </pre>
        )}
      </div>
    );
  }

  return (
    <>
      <tr
        onClick={() => setExpanded((p) => !p)}
        style={{
          cursor: "pointer",
          borderBottom: `1px solid ${TB.borderSoft}`,
        }}
        aria-expanded={expanded}
      >
        <td
          style={{ padding: "10px 12px", whiteSpace: "nowrap", color: TB.text2, fontSize: 12 }}
          title={fmtAbsolute(entry.created_at)}
        >
          {relativeTime(entry.created_at)}
        </td>
        <td style={{ padding: "10px 12px", fontSize: 12, fontFamily: TB.fontMono, color: TB.text2 }}>
          {entry.account_id.length > 10 ? entry.account_id.slice(0, 10) + "…" : entry.account_id}
        </td>
        <td style={{ padding: "10px 12px" }}>
          <Badge color={actionColor(entry.action)}>{entry.action}</Badge>
        </td>
        <td style={{ padding: "10px 12px", fontSize: 12, color: TB.text2 }}>
          {entry.target_type} · {targetTail}
        </td>
        <td style={{ padding: "10px 12px", fontSize: 12, fontFamily: TB.fontMono, color: TB.muted }}>
          {entry.ip_address ?? "—"}
        </td>
        <td
          style={{
            padding: "10px 12px", fontSize: 11, color: TB.muted,
            maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}
          title={entry.user_agent ?? ""}
        >
          {uaTruncated}
        </td>
      </tr>
      {expanded && (
        <tr style={{ background: TB.bg2 }}>
          <td colSpan={6} style={{ padding: "8px 16px" }}>
            <pre
              data-testid={`diff-${entry.id}`}
              style={{
                margin: 0,
                fontSize: 12,
                fontFamily: TB.fontMono,
                whiteSpace: "pre-wrap",
                wordBreak: "break-all",
              }}
            >
              {JSON.stringify(entry.diff, null, 2)}
            </pre>
          </td>
        </tr>
      )}
    </>
  );
}

// ── Filter bar ────────────────────────────────────────────────────────────────

const DATE_PRESETS: { value: DatePreset; labelKey: "last1h" | "last24h" | "last7d" | "last30d" }[] = [
  { value: "1h", labelKey: "last1h" },
  { value: "24h", labelKey: "last24h" },
  { value: "7d", labelKey: "last7d" },
  { value: "30d", labelKey: "last30d" },
];

// ── Main page ─────────────────────────────────────────────────────────────────

export function AuditLogPage({ mockMode = false }: { mockMode?: boolean }) {
  const t = useTranslations("admin.audit");
  const tCommon = useTranslations("common");

  const [offset, setOffset] = useState(0);
  const [actionFilter, setActionFilter] = useState("");
  const [targetFilter, setTargetFilter] = useState("");
  const [datePreset, setDatePreset] = useState<DatePreset | "">("");
  const [search, setSearch] = useState("");

  const dateRange = useMemo(() => presetToRange(datePreset), [datePreset]);

  const apiFilters = useMemo(() => ({
    action: actionFilter || undefined,
    target_type: targetFilter || undefined,
    from: dateRange?.from,
    to: dateRange?.to,
  }), [actionFilter, targetFilter, dateRange]);

  const { data, isLoading } = useAudit(LIMIT, offset, apiFilters);

  // Client-side search filter
  const displayedEntries = useMemo(() => {
    if (!data?.entries) return [];
    if (!search.trim()) return data.entries;
    const q = search.toLowerCase();
    return data.entries.filter(
      (e) =>
        e.action.toLowerCase().includes(q) ||
        e.target_id.toLowerCase().includes(q) ||
        e.target_type.toLowerCase().includes(q) ||
        (e.ip_address ?? "").toLowerCase().includes(q)
    );
  }, [data?.entries, search]);

  // Unique action values from current page for filter dropdown
  const uniqueActions = useMemo(() => {
    if (!data?.entries) return [];
    return Array.from(new Set(data.entries.map((e) => e.action))).sort();
  }, [data?.entries]);

  const uniqueTargetTypes = useMemo(() => {
    if (!data?.entries) return [];
    return Array.from(new Set(data.entries.map((e) => e.target_type))).sort();
  }, [data?.entries]);

  const total = data?.total ?? 0;
  const from = offset + 1;
  const to = Math.min(offset + (data?.entries?.length ?? 0), total);

  const handleExportCsv = useCallback(() => {
    exportCsv(displayedEntries);
  }, [displayedEntries]);

  // Detect narrow viewport for mobile card layout (CSS media query via inline JS)
  const isMobile = typeof window !== "undefined" && window.innerWidth < 700;

  return (
    <div
      style={{
        width: "100vw",
        minHeight: "100vh",
        background: TB.bg,
        display: "flex",
        flexDirection: "column",
        fontFamily: TB.fontBody,
      }}
    >
      {/* Top bar */}
      <div
        style={{
          padding: "10px 20px",
          background: TB.surface,
          borderBottom: `1px solid ${TB.border}`,
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}
      >
        <Link
          href="/"
          style={{
            color: TB.text2,
            textDecoration: "none",
            padding: "6px 10px",
            borderRadius: 6,
            border: `1px solid ${TB.border}`,
            fontSize: 13,
            fontWeight: 500,
          }}
        >
          {tCommon("home")}
        </Link>
        <h1
          style={{
            fontFamily: TB.fontDisplay,
            fontSize: 20,
            fontWeight: 500,
            letterSpacing: "-0.01em",
            color: TB.text,
            margin: 0,
          }}
        >
          {t("title")}
        </h1>
        {mockMode && (
          <span
            style={{
              fontSize: 11,
              background: TB.warning + "20",
              color: TB.warning,
              border: `1px solid ${TB.warning}30`,
              borderRadius: 9999,
              padding: "2px 8px",
              fontWeight: 600,
            }}
          >
            PREVIEW
          </span>
        )}
        <div style={{ flex: 1 }} />
        <button
          data-testid="export-csv"
          onClick={handleExportCsv}
          style={{
            padding: "6px 14px",
            borderRadius: TB.r.md,
            border: `1px solid ${TB.border}`,
            background: TB.surface,
            color: TB.text,
            fontSize: 13,
            fontWeight: 500,
            cursor: "pointer",
            fontFamily: TB.fontBody,
          }}
        >
          {t("exportCsv")}
        </button>
      </div>

      {/* Filter bar */}
      <div
        style={{
          padding: "10px 20px",
          background: TB.surface,
          borderBottom: `1px solid ${TB.border}`,
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          alignItems: "center",
        }}
      >
        {/* Action filter */}
        <select
          aria-label={t("filterAction")}
          value={actionFilter}
          onChange={(e) => { setActionFilter(e.target.value); setOffset(0); }}
          style={selectStyle}
        >
          <option value="">{t("allActions")}</option>
          {uniqueActions.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>

        {/* Target type filter */}
        <select
          aria-label={t("filterTarget")}
          value={targetFilter}
          onChange={(e) => { setTargetFilter(e.target.value); setOffset(0); }}
          style={selectStyle}
        >
          <option value="">{t("allTargets")}</option>
          {uniqueTargetTypes.map((tt) => (
            <option key={tt} value={tt}>{tt}</option>
          ))}
        </select>

        {/* Date range */}
        <div style={{ display: "flex", gap: 2, background: TB.bg2, borderRadius: 8, padding: 2 }}>
          {DATE_PRESETS.map(({ value, labelKey }) => (
            <button
              key={value}
              onClick={() => { setDatePreset(value); setOffset(0); }}
              style={{
                padding: "4px 10px",
                borderRadius: 6,
                border: "none",
                background: datePreset === value ? TB.surface : "transparent",
                color: datePreset === value ? TB.text : TB.text2,
                fontWeight: datePreset === value ? 600 : 450,
                fontSize: 12,
                cursor: "pointer",
                fontFamily: TB.fontBody,
                boxShadow: datePreset === value ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
              }}
            >
              {t(labelKey)}
            </button>
          ))}
        </div>

        {/* Search */}
        <input
          aria-label={t("filterSearch")}
          type="search"
          placeholder={t("filterSearch")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            ...selectStyle,
            flex: "1 1 160px",
            minWidth: 120,
          }}
        />
      </div>

      {/* Table / cards */}
      <div style={{ flex: 1, overflow: "auto", padding: "16px 20px" }}>
        {isLoading ? (
          <div style={{ color: TB.text2, fontSize: 14, padding: 20 }}>
            {tCommon("loading")}
          </div>
        ) : displayedEntries.length === 0 ? (
          <div style={{ color: TB.text2, fontSize: 14, padding: 20 }}>
            {t("noResults")}
          </div>
        ) : isMobile ? (
          <div>
            {displayedEntries.map((entry) => (
              <AuditRow key={entry.id} entry={entry} isMobile={true} />
            ))}
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table
              role="table"
              aria-label={t("title")}
              style={{
                width: "100%",
                borderCollapse: "collapse",
                background: TB.surface,
                borderRadius: TB.r.lg,
                overflow: "hidden",
                border: `1px solid ${TB.border}`,
                fontSize: 13,
              }}
            >
              <thead>
                <tr style={{ background: TB.bg2 }}>
                  {[
                    t("colWhen"),
                    t("colActor"),
                    t("colAction"),
                    t("colTarget"),
                    t("colIp"),
                    t("colUserAgent"),
                  ].map((col) => (
                    <th
                      key={col}
                      scope="col"
                      style={{
                        padding: "8px 12px",
                        textAlign: "left",
                        fontWeight: 600,
                        fontSize: 11,
                        color: TB.text2,
                        letterSpacing: "0.05em",
                        textTransform: "uppercase",
                        borderBottom: `1px solid ${TB.border}`,
                      }}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayedEntries.map((entry) => (
                  <AuditRow key={entry.id} entry={entry} isMobile={false} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {total > 0 && (
        <div
          style={{
            padding: "10px 20px",
            background: TB.surface,
            borderTop: `1px solid ${TB.border}`,
            display: "flex",
            alignItems: "center",
            gap: 12,
            fontSize: 13,
            color: TB.text2,
          }}
        >
          <button
            data-testid="prev-page"
            onClick={() => setOffset(Math.max(0, offset - LIMIT))}
            disabled={offset === 0}
            style={{
              ...paginationBtnStyle,
              opacity: offset === 0 ? 0.4 : 1,
              cursor: offset === 0 ? "not-allowed" : "pointer",
            }}
          >
            {t("prev")}
          </button>
          <span style={{ flex: 1, textAlign: "center", fontSize: 12 }}>
            {t("showing", { from: String(from), to: String(to), total: String(total) })}
          </span>
          <button
            data-testid="next-page"
            onClick={() => setOffset(offset + LIMIT)}
            disabled={offset + LIMIT >= total}
            style={{
              ...paginationBtnStyle,
              opacity: offset + LIMIT >= total ? 0.4 : 1,
              cursor: offset + LIMIT >= total ? "not-allowed" : "pointer",
            }}
          >
            {t("next")}
          </button>
        </div>
      )}
    </div>
  );
}

const selectStyle: React.CSSProperties = {
  padding: "5px 10px",
  borderRadius: TB.r.md,
  border: `1px solid ${TB.border}`,
  background: TB.surface,
  color: TB.text,
  fontSize: 13,
  fontFamily: TB.fontBody,
  outline: "none",
};

const paginationBtnStyle: React.CSSProperties = {
  padding: "5px 12px",
  borderRadius: TB.r.md,
  border: `1px solid ${TB.border}`,
  background: TB.surface,
  color: TB.text,
  fontSize: 12,
  fontFamily: TB.fontBody,
  fontWeight: 500,
};

export default function AuditLogRoute() {
  return (
    <AuthGate>
      <AdminGate>
        <AuditLogPage />
      </AdminGate>
    </AuthGate>
  );
}

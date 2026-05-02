"use client";

/**
 * PantryCues — Cozyla-informed pantry low-stock + expiration hints (issue #86).
 *
 * Renders two kinds of cues for the shopping/pantry view, surfaced to both
 * the kid + admin shopping screens:
 *
 *   • "low" — staple is running out (e.g. "Low on milk").
 *   • "expiring" — staple expires within `expiringWithinDays` (default 5).
 *
 * Cues are derived from a typed `PantryCueRecord[]` rather than scraping
 * unrelated UI state, so the component is fully deterministic and unit-
 * testable. The component renders nothing when there are no cues — callers
 * never need to gate on count themselves.
 *
 * No-AI. No-network. No mutations.
 */

import { TB } from "@/lib/tokens";
import { Icon } from "@/components/ui/icon";

export interface PantryCueRecord {
  /** Stable id (matches the underlying pantry staple row when available). */
  id: string;
  /** Display name of the pantry item, e.g. "milk". */
  name: string;
  /**
   * Optional remaining-quantity hint. Values <= `lowStockThreshold` (default 1)
   * trigger a "low" cue. `undefined` means we don't know the level — no cue.
   */
  amount?: number;
  unit?: string;
  /**
   * Optional ISO-8601 date (`YYYY-MM-DD`) the staple expires. Cues fire when
   * the date is within `expiringWithinDays` (default 5) from `now`. Past dates
   * also fire as expiring (with "expired" wording).
   */
  expiresOn?: string;
}

export type PantryCueKind = "low" | "expiring" | "expired";

export interface PantryCueComputed {
  id: string;
  name: string;
  kind: PantryCueKind;
  /** Localised display message, e.g. "Low on milk", "Yogurt expires in 2 days". */
  message: string;
  /** Days-from-`now` for expiration cues; undefined for low-stock. */
  daysUntilExpiry?: number;
}

const DEFAULT_LOW_THRESHOLD = 1;
const DEFAULT_EXPIRING_WINDOW_DAYS = 5;

/**
 * Pure cue derivation. Exported for unit tests + consumers that want to count
 * cues elsewhere (e.g. a badge on the shopping nav).
 */
export function computePantryCues(
  records: PantryCueRecord[],
  options: {
    now?: Date;
    lowStockThreshold?: number;
    expiringWithinDays?: number;
  } = {}
): PantryCueComputed[] {
  const now = options.now ?? new Date();
  const lowThreshold = options.lowStockThreshold ?? DEFAULT_LOW_THRESHOLD;
  const window = options.expiringWithinDays ?? DEFAULT_EXPIRING_WINDOW_DAYS;
  const out: PantryCueComputed[] = [];

  for (const r of records) {
    const cues: PantryCueComputed[] = [];
    if (typeof r.amount === "number" && r.amount <= lowThreshold) {
      cues.push({
        id: r.id,
        name: r.name,
        kind: "low",
        message: `Low on ${r.name}`,
      });
    }
    if (r.expiresOn) {
      const days = daysFromNow(r.expiresOn, now);
      if (days !== null) {
        if (days < 0) {
          cues.push({
            id: r.id,
            name: r.name,
            kind: "expired",
            message: `${capitalize(r.name)} expired ${pluralize(-days, "day")} ago`,
            daysUntilExpiry: days,
          });
        } else if (days <= window) {
          cues.push({
            id: r.id,
            name: r.name,
            kind: "expiring",
            message:
              days === 0
                ? `${capitalize(r.name)} expires today`
                : `${capitalize(r.name)} expires in ${pluralize(days, "day")}`,
            daysUntilExpiry: days,
          });
        }
      }
    }
    out.push(...cues);
  }

  // Sort: expired > expiring (sooner-first) > low.
  out.sort((a, b) => {
    const rank = (c: PantryCueComputed) =>
      c.kind === "expired" ? 0 : c.kind === "expiring" ? 1 : 2;
    const r = rank(a) - rank(b);
    if (r !== 0) return r;
    if (a.daysUntilExpiry !== undefined && b.daysUntilExpiry !== undefined) {
      return a.daysUntilExpiry - b.daysUntilExpiry;
    }
    return a.name.localeCompare(b.name);
  });

  return out;
}

function daysFromNow(isoDate: string, now: Date): number | null {
  // Parse YYYY-MM-DD as UTC midnight to avoid TZ drift.
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!m) return null;
  const target = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((target - today) / 86_400_000);
}

function pluralize(n: number, noun: string): string {
  return `${n} ${noun}${n === 1 ? "" : "s"}`;
}

function capitalize(s: string): string {
  return s.length === 0 ? s : s[0].toUpperCase() + s.slice(1);
}

// ─────────────────────────────────────────────────────────────────────────────
// View component
// ─────────────────────────────────────────────────────────────────────────────

export function PantryCues({
  records,
  now,
  lowStockThreshold,
  expiringWithinDays,
  /** Hides the surrounding card chrome — useful inside a list header. */
  flat = false,
}: {
  records: PantryCueRecord[];
  now?: Date;
  lowStockThreshold?: number;
  expiringWithinDays?: number;
  flat?: boolean;
}) {
  const cues = computePantryCues(records, {
    now,
    lowStockThreshold,
    expiringWithinDays,
  });
  if (cues.length === 0) return null;

  return (
    <div
      data-testid="pantry-cues"
      role="status"
      aria-live="polite"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
        padding: flat ? 0 : "10px 12px",
        margin: flat ? 0 : "8px 16px",
        background: flat ? "transparent" : TB.warning + "12",
        border: flat ? "none" : `1px solid ${TB.warning}55`,
        borderRadius: flat ? 0 : 10,
      }}
    >
      {!flat && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: TB.warning,
          }}
        >
          <Icon name="bell" size={12} color={TB.warning} />
          Pantry cues
        </div>
      )}
      <ul
        style={{
          margin: 0,
          padding: 0,
          listStyle: "none",
          display: "flex",
          flexDirection: "column",
          gap: 4,
        }}
      >
        {cues.map((c, i) => (
          <li
            key={`${c.id}-${c.kind}-${i}`}
            data-testid={`pantry-cue-${c.kind}`}
            data-cue-id={c.id}
            style={{
              fontSize: 13,
              color: c.kind === "expired" ? TB.destructive : TB.text,
              fontWeight: c.kind === "expired" ? 600 : 500,
            }}
          >
            {c.message}
          </li>
        ))}
      </ul>
    </div>
  );
}

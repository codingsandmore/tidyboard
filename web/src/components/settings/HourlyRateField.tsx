"use client";

/**
 * HourlyRateField — private "Hourly rate" min/max editor for a household member.
 *
 * Privacy contract (spec section G.5 of fairplay-design):
 *   - The viewer must be either (a) the rate owner, or (b) a household admin.
 *   - For any other viewer (e.g. a child looking at another member's profile),
 *     the entire section is hidden — not shown as locked, not shown as zero.
 *
 * The backend redacts the hourly_rate_cents_* fields server-side for
 * unauthorized viewers (#135). This component is the matching client-side
 * privacy gate so the section never renders for unauthorized viewers, even if
 * the API somehow returned the fields.
 *
 * The API stores cents; the form takes whole-dollar input and converts on save.
 */

import { useEffect, useState } from "react";
import { TB } from "@/lib/tokens";
import { useUpdateMember } from "@/lib/api/hooks";

export interface HourlyRateViewer {
  id: string;
  role: "adult" | "child";
}

export interface HourlyRateMember {
  id: string;
  name: string;
  hourly_rate_cents_min?: number | null;
  hourly_rate_cents_max?: number | null;
}

interface HourlyRateFieldProps {
  viewer: { id: string; role: "adult" | "child"; name?: string };
  member: HourlyRateMember;
  householdId: string;
}

function centsToDollarString(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return "";
  // Display whole-dollar amounts; if cents are non-zero, show with two decimals.
  const dollars = cents / 100;
  return Number.isInteger(dollars) ? String(dollars) : dollars.toFixed(2);
}

function dollarStringToCents(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const dollars = Number(trimmed);
  if (!Number.isFinite(dollars) || dollars < 0) return null;
  return Math.round(dollars * 100);
}

/**
 * Returns true when the viewer is permitted to see/edit the target member's
 * hourly rate. Mirrors the backend authorization rule.
 */
export function canViewHourlyRate(
  viewer: { id: string; role: "adult" | "child" } | null | undefined,
  targetMemberId: string,
): boolean {
  if (!viewer) return false;
  if (viewer.role === "adult") return true;
  return viewer.id === targetMemberId;
}

export function HourlyRateField({
  viewer,
  member,
  householdId,
}: HourlyRateFieldProps) {
  const updateMember = useUpdateMember();

  const [minDollars, setMinDollars] = useState<string>(() =>
    centsToDollarString(member.hourly_rate_cents_min),
  );
  const [maxDollars, setMaxDollars] = useState<string>(() =>
    centsToDollarString(member.hourly_rate_cents_max),
  );
  const [error, setError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  // Reset form when target member changes (e.g. switching profile in a list).
  useEffect(() => {
    setMinDollars(centsToDollarString(member.hourly_rate_cents_min));
    setMaxDollars(centsToDollarString(member.hourly_rate_cents_max));
    setError(null);
    setSavedFlash(false);
  }, [member.id, member.hourly_rate_cents_min, member.hourly_rate_cents_max]);

  if (!canViewHourlyRate(viewer, member.id)) {
    // Hide section entirely — render NOTHING. Privacy contract requires this
    // not be visible at all (no "locked" placeholder, no zero stub).
    return null;
  }

  async function handleSave() {
    setError(null);
    const minCents = dollarStringToCents(minDollars);
    const maxCents = dollarStringToCents(maxDollars);

    if (minDollars.trim() !== "" && minCents === null) {
      setError("Minimum must be a non-negative number.");
      return;
    }
    if (maxDollars.trim() !== "" && maxCents === null) {
      setError("Maximum must be a non-negative number.");
      return;
    }
    if (minCents !== null && maxCents !== null && minCents > maxCents) {
      setError("Minimum cannot exceed maximum.");
      return;
    }

    try {
      await updateMember.mutateAsync({
        householdId,
        memberId: member.id,
        hourlyRateCentsMin: minCents,
        hourlyRateCentsMax: maxCents,
      });
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1800);
    } catch {
      setError("Failed to save hourly rate.");
    }
  }

  const inputStyle = {
    padding: "6px 10px",
    borderRadius: TB.r.md,
    border: `1px solid ${TB.border}`,
    fontFamily: TB.fontBody,
    fontSize: 13,
    background: TB.bg,
    color: TB.text,
    width: 100,
    boxSizing: "border-box" as const,
  };

  return (
    <div
      data-testid="hourly-rate-section"
      style={{
        padding: "12px 16px",
        background: TB.surface,
        borderBottom: `1px solid ${TB.border}`,
        fontFamily: TB.fontBody,
        fontSize: 13,
      }}
    >
      <div style={{ color: TB.text2, fontWeight: 500, marginBottom: 4 }}>
        Hourly rate
      </div>
      <div style={{ fontSize: 11, color: TB.muted, marginBottom: 8 }}>
        Private — visible only to you and your household admin.
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <label
          style={{ display: "flex", alignItems: "center", gap: 6, color: TB.text2 }}
        >
          <span style={{ fontSize: 12 }}>Min $/hr</span>
          <input
            data-testid="hourly-rate-min"
            type="number"
            inputMode="decimal"
            min={0}
            step={1}
            value={minDollars}
            onChange={(e) => setMinDollars(e.target.value)}
            placeholder="—"
            style={inputStyle}
          />
        </label>

        <label
          style={{ display: "flex", alignItems: "center", gap: 6, color: TB.text2 }}
        >
          <span style={{ fontSize: 12 }}>Max $/hr</span>
          <input
            data-testid="hourly-rate-max"
            type="number"
            inputMode="decimal"
            min={0}
            step={1}
            value={maxDollars}
            onChange={(e) => setMaxDollars(e.target.value)}
            placeholder="—"
            style={inputStyle}
          />
        </label>

        <button
          type="button"
          data-testid="hourly-rate-save"
          onClick={handleSave}
          disabled={updateMember.isPending}
          style={{
            padding: "6px 14px",
            borderRadius: TB.r.md,
            border: "none",
            background: TB.primary,
            color: TB.primaryFg,
            cursor: updateMember.isPending ? "wait" : "pointer",
            fontFamily: TB.fontBody,
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          {updateMember.isPending ? "Saving…" : "Save"}
        </button>

        {savedFlash && (
          <span
            data-testid="hourly-rate-saved"
            style={{ fontSize: 12, color: TB.success }}
          >
            Saved.
          </span>
        )}
      </div>

      {error && (
        <div
          data-testid="hourly-rate-error"
          style={{ marginTop: 6, fontSize: 12, color: TB.destructive }}
        >
          {error}
        </div>
      )}
    </div>
  );
}

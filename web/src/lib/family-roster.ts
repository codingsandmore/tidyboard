/**
 * Family roster contract module — Cozyla Hub foundation.
 *
 * Provides the shared, widget-facing projection of household members so
 * downstream Cozyla widgets (#83 #84 #85 #86) consume a stable shape
 * instead of reaching into the full {@link Member} type. The full Member
 * type carries admin-only fields (stars, streak, full legal name) that
 * widgets rendered on the always-on hub display must not surface.
 *
 * Exports:
 *  - {@link normalizeMemberColor} — stable lowercase hex with safe fallback
 *  - {@link getMemberInitials}    — 1–2 char initials from a display name
 *  - {@link toWidgetMember}       — Member → {@link WidgetMember} projection
 *  - {@link DEFAULT_MEMBER_COLOR} — fallback color when input is missing
 */
import type { Member, Role } from "./data";

/** Default color used when a Member has no usable color. */
export const DEFAULT_MEMBER_COLOR = "#94a3b8"; // slate-400

const HEX6_RE = /^#[0-9a-f]{6}$/i;
const HEX3_RE = /^#[0-9a-f]{3}$/i;

/**
 * Returns a normalized, lowercase 6-digit hex color. Accepts 3- or 6-digit
 * hex; falls back to {@link DEFAULT_MEMBER_COLOR} when input is empty,
 * non-string, or unparseable. Pure / no I/O.
 */
export function normalizeMemberColor(color: string): string {
  if (typeof color !== "string") return DEFAULT_MEMBER_COLOR;
  const trimmed = color.trim().toLowerCase();
  if (!trimmed) return DEFAULT_MEMBER_COLOR;
  if (HEX6_RE.test(trimmed)) return trimmed;
  if (HEX3_RE.test(trimmed)) {
    // Expand #abc → #aabbcc
    const r = trimmed[1];
    const g = trimmed[2];
    const b = trimmed[3];
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  return DEFAULT_MEMBER_COLOR;
}

/**
 * Returns 1–2 uppercase initials from a display name. Uses the first
 * letter of the first word and the first letter of the last word for
 * multi-word names, just the first letter for a single word, and "?"
 * when no usable input is available.
 */
export function getMemberInitials(name: string): string {
  if (typeof name !== "string") return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.charAt(0).toUpperCase();
  const first = parts[0]!.charAt(0);
  const last = parts[parts.length - 1]!.charAt(0);
  return (first + last).toUpperCase();
}

/**
 * Minimal projection of {@link Member} for widget consumers. Intentionally
 * omits admin/gamification fields (stars, streak, legal full name) so
 * widgets rendered on the shared hub surface only public roster info.
 */
export type WidgetMember = {
  id: string;
  name: string;
  role: Role;
  color: string;
  initials: string;
  age_group?: Member["age_group"];
};

/**
 * Project a full {@link Member} into the widget-safe {@link WidgetMember}
 * contract. Color is normalized via {@link normalizeMemberColor} and
 * initials are derived from the member's full name (falling back to the
 * short name when full is absent).
 */
export function toWidgetMember(member: Member): WidgetMember {
  const sourceName = member.full && member.full.trim() ? member.full : member.name;
  return {
    id: member.id,
    name: member.name,
    role: member.role,
    color: normalizeMemberColor(member.color),
    initials: getMemberInitials(sourceName),
    age_group: member.age_group,
  };
}

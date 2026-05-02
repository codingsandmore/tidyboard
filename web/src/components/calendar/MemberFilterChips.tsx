"use client";

import type { CSSProperties } from "react";
import { TB } from "@/lib/tokens";
import type { Member, TBDEvent } from "@/lib/data";
import { Avatar } from "@/components/ui/avatar";

/**
 * MemberFilterChips — issue #84.
 *
 * A horizontal, touch-friendly chip row that lets the kiosk user filter the
 * calendar by member. The leftmost chip is "All", which clears the filter.
 * Each remaining chip shows the member's avatar + first name. Selected
 * state is reflected via opacity + the member colour ring (matching the
 * EventModal assignee chip pattern in calendar.tsx).
 *
 * Filtering is "any-match": an event is shown when its assignee list
 * contains the chosen member id. The {@link filterEventsByMember} helper
 * is exported for reuse in the calendar views.
 *
 * Acceptance criteria covered (issue #84):
 *   - "Member filters only show relevant member/shared events."
 */

export type MemberFilterChipsProps = {
  members: Member[];
  /** Currently-selected member id, or null for "All". */
  selected: string | null;
  onChange: (memberId: string | null) => void;
  style?: CSSProperties;
  dark?: boolean;
};

const CHIP_MIN_HEIGHT = 56; // touch-target floor for kiosks

export function MemberFilterChips({
  members,
  selected,
  onChange,
  style,
  dark = false,
}: MemberFilterChipsProps) {
  const text = dark ? TB.dText : TB.text;
  const text2 = dark ? TB.dText2 : TB.text2;
  const surfaceSelected = dark ? TB.dElevated : TB.surface;
  const borderSel = dark ? TB.dBorder : TB.border;
  const borderUnsel = dark ? TB.dBorderSoft : TB.borderSoft;

  const allSelected = selected == null;

  return (
    <div
      role="group"
      aria-label="Filter calendar by member"
      data-testid="member-filter-chips"
      style={{
        display: "flex",
        gap: 10,
        padding: "10px 16px",
        overflowX: "auto",
        WebkitOverflowScrolling: "touch",
        ...style,
      }}
    >
      <button
        type="button"
        role="radio"
        aria-checked={allSelected}
        data-testid="member-filter-all"
        data-selected={allSelected ? "true" : "false"}
        onClick={() => onChange(null)}
        style={{
          minHeight: CHIP_MIN_HEIGHT,
          padding: "8px 18px",
          borderRadius: 999,
          border: `1.5px solid ${allSelected ? TB.primary : borderUnsel}`,
          background: allSelected ? TB.primary + "14" : surfaceSelected,
          color: allSelected ? TB.primary : text,
          fontFamily: TB.fontBody,
          fontSize: 14,
          fontWeight: 600,
          cursor: "pointer",
          flexShrink: 0,
          opacity: allSelected ? 1 : 0.7,
        }}
      >
        All
      </button>
      {members.map((m) => {
        const isSelected = selected === m.id;
        return (
          <button
            key={m.id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-label={`Show only ${m.name}'s events`}
            data-testid={`member-filter-${m.id}`}
            data-selected={isSelected ? "true" : "false"}
            onClick={() => onChange(m.id)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              minHeight: CHIP_MIN_HEIGHT,
              padding: "6px 14px 6px 6px",
              borderRadius: 999,
              border: `1.5px solid ${isSelected ? m.color : borderUnsel}`,
              background: isSelected ? m.color + "1A" : surfaceSelected,
              color: isSelected ? text : text2,
              fontFamily: TB.fontBody,
              fontSize: 14,
              fontWeight: isSelected ? 600 : 500,
              cursor: "pointer",
              flexShrink: 0,
              opacity: isSelected ? 1 : 0.75,
              transition: "opacity 120ms ease, border-color 120ms ease",
            }}
          >
            <Avatar member={m} size={36} ring={false} />
            <span>{m.name}</span>
          </button>
        );
      })}
      {/* Reserve room past the last chip so the focus ring isn't clipped. */}
      <div style={{ width: 4, flexShrink: 0 }} aria-hidden="true" />
      <span style={{ display: "none" }} data-border={borderSel} />
    </div>
  );
}

/**
 * Pure helper: returns the subset of events whose assignee list contains
 * `memberId`. Returns the input array unchanged when `memberId` is null.
 *
 * Mirrors the `assigned_members ?? members ?? []` precedence used
 * throughout calendar.tsx (assigned_members is the canonical API field;
 * legacy fixtures populate the `members` field).
 */
export function filterEventsByMember<T extends TBDEvent | (Pick<TBDEvent, "members"> & Partial<Pick<TBDEvent, "assigned_members">>)>(
  events: T[],
  memberId: string | null
): T[] {
  if (memberId == null) return events;
  return events.filter((e) => {
    const ids = e.assigned_members ?? e.members ?? [];
    return ids.includes(memberId);
  });
}

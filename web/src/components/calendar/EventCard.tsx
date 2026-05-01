"use client";

import type { CSSProperties, KeyboardEvent } from "react";
import { TB } from "@/lib/tokens";
import { fmtTime } from "@/lib/time";
import type { Member, TBDEvent } from "@/lib/data";
import { Card } from "@/components/ui/card";
import { StackedAvatars } from "@/components/ui/avatar";

/**
 * EventCard — cohesive event-card chrome lifted out of `calendar.tsx`.
 *
 * The original Agenda view rendered the same avatar+title+time+location card
 * inline. Issue #146 (spec section B.1) called for extracting that chunk into
 * a reusable component so other surfaces (countdown widget, race screen, etc.)
 * can share the visual contract.
 *
 * Two variants are supported today:
 *   - `full`   : the agenda card — stacked avatars on the left, title/time
 *                /location stack on the right. ~56px tall.
 *   - `compact`: a single-line dense variant for grid cells (week/day) with
 *                left accent bar, time mono caption, title.
 */

export type EventCardVariant = "full" | "compact";

export type EventCardProps = {
  event: TBDEvent;
  /** Resolved members for this event (already filtered to existing IDs). */
  members?: Member[];
  variant?: EventCardVariant;
  /** Optional accent colour override (compact variant). Defaults to first member's colour. */
  accent?: string;
  onClick?: (event: TBDEvent) => void;
  /** When set, overrides the default test id. */
  "data-testid"?: string;
  style?: CSSProperties;
};

export function EventCard({
  event,
  members = [],
  variant = "full",
  accent,
  onClick,
  "data-testid": testId,
  style,
}: EventCardProps) {
  const handleKey = (ev: KeyboardEvent<HTMLDivElement | HTMLButtonElement>) => {
    if (ev.key === "Enter" || ev.key === " ") {
      ev.preventDefault();
      onClick?.(event);
    }
  };

  if (variant === "compact") {
    const c = accent ?? members[0]?.color ?? TB.primary;
    return (
      <div
        role="button"
        tabIndex={0}
        data-testid={testId ?? `event-card-${event.id}`}
        onClick={() => onClick?.(event)}
        onKeyDown={handleKey}
        style={{
          padding: "4px 6px",
          background: c + "1A",
          borderLeft: `2.5px solid ${c}`,
          borderRadius: 4,
          fontSize: 10,
          cursor: "pointer",
          ...style,
        }}
      >
        <div
          style={{
            fontFamily: TB.fontMono,
            color: TB.text2,
            fontSize: 9,
          }}
        >
          {fmtTime(event.start)}
        </div>
        <div style={{ fontWeight: 600, marginTop: 1, color: TB.text }}>
          {event.title}
        </div>
      </div>
    );
  }

  return (
    <Card
      pad={12}
      role="button"
      tabIndex={0}
      data-testid={testId ?? `event-card-${event.id}`}
      onClick={() => onClick?.(event)}
      onKeyDown={handleKey}
      style={{ display: "flex", alignItems: "center", gap: 14, cursor: "pointer", ...style }}
    >
      <StackedAvatars members={members} size={32} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 550 }}>{event.title}</div>
        <div
          style={{
            fontSize: 12,
            color: TB.text2,
            marginTop: 2,
            fontFamily: TB.fontMono,
          }}
        >
          {fmtTime(event.start)} – {fmtTime(event.end)}
          {event.location ? ` · ${event.location}` : ""}
        </div>
      </div>
    </Card>
  );
}

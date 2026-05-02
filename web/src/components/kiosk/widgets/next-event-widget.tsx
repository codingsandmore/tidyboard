"use client";

import { TB } from "@/lib/tokens";
import { Icon } from "@/components/ui/icon";
import type { TBDEvent } from "@/lib/data";
import type { WidgetMember } from "@/lib/family-roster";
import { fmtTime } from "@/lib/time";
import { WidgetFrame, WidgetEmpty } from "./widget-frame";

/**
 * NextEventWidget — large hero card for the next upcoming event.
 *
 * Used on /kiosk/today as the high-glance "what's happening soon" card.
 */
export interface NextEventWidgetProps {
  event?: TBDEvent;
  members: WidgetMember[];
  "data-testid"?: string;
}

function eventAssignees(event: TBDEvent): string[] {
  return event.assigned_members ?? event.members ?? [];
}

function formatStart(value: string | undefined): string {
  if (!value) return "";
  if (value.includes("T")) {
    return new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(value));
  }
  return fmtTime(value);
}

export function NextEventWidget({
  event,
  members,
  ...rest
}: NextEventWidgetProps) {
  const testId = rest["data-testid"] ?? "kiosk-next-event";
  if (!event) {
    return (
      <WidgetFrame data-testid={testId} eyebrow="Next up" title="No upcoming events">
        <WidgetEmpty
          message="Nothing scheduled next"
          hint="Add calendar events to populate this card."
          testId={`${testId}-empty`}
        />
      </WidgetFrame>
    );
  }

  const memberById = new Map(members.map((m) => [m.id, m]));
  const assignees = eventAssignees(event)
    .map((id) => memberById.get(id))
    .filter((m): m is WidgetMember => Boolean(m));

  return (
    <WidgetFrame
      data-testid={testId}
      background={TB.primary}
      style={{ color: TB.primaryFg }}
    >
      <div
        style={{
          fontFamily: TB.fontMono,
          fontSize: 12,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: TB.primaryFg,
          opacity: 0.8,
        }}
      >
        Next up
      </div>
      <div
        data-testid="kiosk-next-event-title"
        style={{
          fontFamily: TB.fontDisplay,
          fontSize: 30,
          fontWeight: 500,
          marginTop: 6,
          color: TB.primaryFg,
        }}
      >
        {event.title}
      </div>
      <div
        style={{
          marginTop: 12,
          display: "flex",
          alignItems: "center",
          gap: 14,
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 14,
          }}
        >
          <Icon name="clock" size={16} color={TB.primaryFg} />
          <span>{formatStart(event.start_time ?? event.start)}</span>
        </div>
        {event.location && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 14,
              opacity: 0.92,
            }}
          >
            <Icon name="mapPin" size={16} color={TB.primaryFg} />
            <span>{event.location}</span>
          </div>
        )}
        <div style={{ display: "flex", gap: 4, marginLeft: "auto" }}>
          {assignees.slice(0, 4).map((m) => (
            <div
              key={m.id}
              data-testid={`kiosk-next-event-member-${m.id}`}
              style={{
                width: 28,
                height: 28,
                borderRadius: TB.r.full,
                background: m.color,
                border: `2px solid ${TB.primaryFg}`,
                color: "#fff",
                fontSize: 11,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {m.initials}
            </div>
          ))}
        </div>
      </div>
    </WidgetFrame>
  );
}

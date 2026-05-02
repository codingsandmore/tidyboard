"use client";

import { TB } from "@/lib/tokens";
import { Icon } from "@/components/ui/icon";
import type { TBDEvent } from "@/lib/data";
import type { WidgetMember } from "@/lib/family-roster";
import { fmtTime } from "@/lib/time";
import { WidgetFrame, WidgetEmpty } from "./widget-frame";

/**
 * AgendaListWidget — vertical list of today's events with member dots.
 *
 * Reads {@link WidgetMember} (the Cozyla hub-foundation projection) so the
 * widget never reaches into admin-only Member fields.
 */
export interface AgendaListWidgetProps {
  events: TBDEvent[];
  members: WidgetMember[];
  /** How many events to show; rest summarized as "+N more". */
  limit?: number;
  title?: string;
  "data-testid"?: string;
}

function eventAssignees(event: TBDEvent): string[] {
  return event.assigned_members ?? event.members ?? [];
}

function formatStart(value: string): string {
  if (!value) return "";
  if (value.includes("T")) {
    return new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(value));
  }
  return fmtTime(value);
}

export function AgendaListWidget({
  events,
  members,
  limit = 6,
  title = "Today's schedule",
  ...rest
}: AgendaListWidgetProps) {
  const memberById = new Map(members.map((m) => [m.id, m]));
  const visible = events.slice(0, limit);
  const overflow = Math.max(0, events.length - visible.length);

  return (
    <WidgetFrame
      data-testid={rest["data-testid"] ?? "kiosk-agenda"}
      eyebrow="Agenda"
      title={title}
      trailing={
        <div style={{ fontFamily: TB.fontMono, fontSize: 12, color: TB.text2 }}>
          {events.length} event{events.length === 1 ? "" : "s"}
        </div>
      }
    >
      {events.length === 0 ? (
        <WidgetEmpty
          message="No events scheduled today"
          hint="Add calendar events to fill this view."
          testId="kiosk-agenda-empty"
        />
      ) : (
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          {visible.map((event) => {
            const assigneeIds = eventAssignees(event);
            const assigneeMembers = assigneeIds
              .map((id) => memberById.get(id))
              .filter((m): m is WidgetMember => Boolean(m));
            const accent =
              assigneeMembers.length === 1
                ? assigneeMembers[0]!.color
                : TB.primary;
            return (
              <li
                key={event.id}
                data-testid={`kiosk-agenda-item-${event.id}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "10px 12px",
                  borderRadius: TB.r.lg,
                  background: TB.bg2,
                }}
              >
                <div
                  style={{
                    width: 4,
                    alignSelf: "stretch",
                    background: accent,
                    borderRadius: 2,
                  }}
                />
                <div style={{ minWidth: 76 }}>
                  <div
                    style={{
                      fontFamily: TB.fontMono,
                      fontSize: 14,
                      color: TB.text,
                      fontWeight: 500,
                    }}
                  >
                    {formatStart(event.start_time ?? event.start)}
                  </div>
                  {(event.end_time || event.end) && (
                    <div
                      style={{
                        fontFamily: TB.fontMono,
                        fontSize: 11,
                        color: TB.text2,
                      }}
                    >
                      → {formatStart(event.end_time ?? event.end)}
                    </div>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 550,
                      color: TB.text,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {event.title}
                  </div>
                  {event.location && (
                    <div
                      style={{
                        fontSize: 12,
                        color: TB.text2,
                        marginTop: 2,
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <Icon name="mapPin" size={11} />
                      {event.location}
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  {assigneeMembers.slice(0, 3).map((m) => (
                    <div
                      key={m.id}
                      title={m.name}
                      data-testid={`kiosk-agenda-dot-${event.id}-${m.id}`}
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: TB.r.full,
                        background: m.color,
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
              </li>
            );
          })}
          {overflow > 0 && (
            <li
              style={{
                fontSize: 13,
                color: TB.text2,
                fontFamily: TB.fontMono,
                paddingLeft: 12,
              }}
              data-testid="kiosk-agenda-overflow"
            >
              +{overflow} more
            </li>
          )}
        </ul>
      )}
    </WidgetFrame>
  );
}

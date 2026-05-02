"use client";

import { TB } from "@/lib/tokens";
import type { TBDEvent } from "@/lib/data";
import type { WidgetMember } from "@/lib/family-roster";
import { WidgetFrame, WidgetEmpty } from "./widget-frame";

/**
 * WeekCalendarWidget — 7-day at-a-glance grid with member-coloured dots
 * representing event count per member per day. Clicks are not handled here;
 * the widget is a passive overview. Used on /kiosk/week.
 */
export interface WeekCalendarWidgetProps {
  /** Anchor date — week shown is the 7 days starting Monday of `weekOf`. */
  weekOf?: Date;
  events: TBDEvent[];
  members: WidgetMember[];
  "data-testid"?: string;
}

function eventAssignees(event: TBDEvent): string[] {
  return event.assigned_members ?? event.members ?? [];
}

function startOfMondayWeek(d: Date): Date {
  // 0 = Sun, 1 = Mon … 6 = Sat
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1 - day);
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate() + diff);
  return start;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function eventDate(event: TBDEvent): Date | null {
  const raw = event.start_time ?? event.start;
  if (!raw) return null;
  if (raw.includes("T")) {
    const d = new Date(raw);
    return isNaN(d.getTime()) ? null : d;
  }
  // HH:mm sample fixture has no date — skip; week widget needs ISO dates.
  return null;
}

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function WeekCalendarWidget({
  weekOf,
  events,
  members,
  ...rest
}: WeekCalendarWidgetProps) {
  const anchor = weekOf ?? new Date();
  const start = startOfMondayWeek(anchor);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
  const memberById = new Map(members.map((m) => [m.id, m]));
  const eventsWithDates = events
    .map((e) => ({ event: e, date: eventDate(e) }))
    .filter((entry): entry is { event: TBDEvent; date: Date } => entry.date !== null);

  const total = eventsWithDates.length;

  return (
    <WidgetFrame
      data-testid={rest["data-testid"] ?? "kiosk-week"}
      eyebrow="This week"
      title={`${total} event${total === 1 ? "" : "s"}`}
    >
      {total === 0 ? (
        <WidgetEmpty
          message="No events this week"
          hint="Schedule events to fill the week view."
          testId="kiosk-week-empty"
        />
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
            gap: 8,
          }}
        >
          {days.map((day, idx) => {
            const dayEvents = eventsWithDates
              .filter(({ date }) => isSameDay(date, day))
              .map(({ event }) => event);
            const isToday = isSameDay(day, new Date());
            return (
              <div
                key={idx}
                data-testid={`kiosk-week-day-${idx}`}
                style={{
                  background: isToday ? TB.bg2 : TB.surface,
                  border: `1px solid ${TB.border}`,
                  borderRadius: TB.r.lg,
                  padding: 10,
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  minHeight: 120,
                }}
              >
                <div
                  style={{
                    fontFamily: TB.fontMono,
                    fontSize: 11,
                    color: TB.text2,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                  }}
                >
                  {DAY_LABELS[idx]}
                </div>
                <div
                  style={{
                    fontFamily: TB.fontDisplay,
                    fontSize: 20,
                    fontWeight: 500,
                    color: isToday ? TB.primary : TB.text,
                  }}
                >
                  {day.getDate()}
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                  }}
                >
                  {dayEvents.slice(0, 3).map((event) => {
                    const assigneeIds = eventAssignees(event);
                    const accent =
                      assigneeIds.length === 1
                        ? memberById.get(assigneeIds[0]!)?.color ?? TB.primary
                        : TB.primary;
                    return (
                      <div
                        key={event.id}
                        data-testid={`kiosk-week-event-${event.id}`}
                        style={{
                          fontSize: 12,
                          color: TB.text,
                          padding: "2px 6px",
                          borderRadius: TB.r.sm,
                          background: `${accent}22`,
                          borderLeft: `3px solid ${accent}`,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {event.title}
                      </div>
                    );
                  })}
                  {dayEvents.length > 3 && (
                    <div style={{ fontSize: 11, color: TB.text2 }}>
                      +{dayEvents.length - 3}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </WidgetFrame>
  );
}

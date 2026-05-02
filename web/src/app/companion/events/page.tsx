"use client";

/**
 * /companion/events — read-only events list for the Companion PWA (#89).
 *
 * Mobile-first list of upcoming events sorted by start time. The actual
 * editing flow lives on /calendar; this page is a phone-friendly digest so
 * adults can glance at the household calendar without unlocking the kiosk.
 */

import { useMemo } from "react";
import { MobileShell } from "@/components/companion/MobileShell";
import { useEvents } from "@/lib/api/hooks";
import type { TBDEvent } from "@/lib/data";

function eventStartIso(event: TBDEvent): string {
  return event.start_time ?? event.start ?? "";
}

function eventEpoch(event: TBDEvent): number {
  const raw = eventStartIso(event);
  if (!raw) return Number.POSITIVE_INFINITY;
  if (raw.includes("T")) {
    const t = new Date(raw).getTime();
    return isNaN(t) ? Number.POSITIVE_INFINITY : t;
  }
  // HH:mm fixture form — anchor to today for deterministic ordering.
  const [h, m] = raw.split(":").map((n) => Number(n) || 0);
  const today = new Date();
  return new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
    h,
    m
  ).getTime();
}

function formatWhen(event: TBDEvent): string {
  const raw = eventStartIso(event);
  if (!raw) return "Unscheduled";
  if (raw.includes("T")) {
    const d = new Date(raw);
    if (isNaN(d.getTime())) return raw;
    return d.toLocaleString(undefined, {
      weekday: "short",
      hour: "numeric",
      minute: "2-digit",
    });
  }
  return raw; // HH:mm passthrough
}

export default function CompanionEventsPage() {
  const { data: events } = useEvents();

  const sorted = useMemo(
    () => [...(events ?? [])].sort((a, b) => eventEpoch(a) - eventEpoch(b)),
    [events]
  );

  return (
    <MobileShell active="events" heading="Events" subheading="Upcoming">
      {sorted.length === 0 ? (
        <div data-testid="companion-events-empty" style={{ color: "#6b7280" }}>
          No upcoming events.
        </div>
      ) : (
        <ul
          data-testid="companion-events-list"
          style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 10 }}
        >
          {sorted.map((event) => (
            <li
              key={event.id}
              data-testid={`companion-event-${event.id}`}
              style={{
                padding: "14px 16px",
                borderRadius: 12,
                background: "#ffffff",
                border: "1px solid #ececeb",
              }}
            >
              <div style={{ fontWeight: 600, fontSize: 16 }}>{event.title}</div>
              <div style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>
                {formatWhen(event)}
                {event.location ? ` · ${event.location}` : ""}
              </div>
            </li>
          ))}
        </ul>
      )}
    </MobileShell>
  );
}

"use client";

/**
 * /kiosk/today — fixed Cozyla-style kiosk Today page (#83).
 *
 * Renders the canonical Today layout: clock + weather hero, next-up event,
 * and the household agenda. Uses live (no-fallback) hooks per the widget
 * data contract from #82.
 */

import { useMemo } from "react";
import { TB } from "@/lib/tokens";
import { KioskPageShell } from "@/components/kiosk/kiosk-page-shell";
import { useWidgetMembers } from "@/components/kiosk/use-widget-members";
import {
  AgendaListWidget,
  ClockWeatherWidget,
  NextEventWidget,
} from "@/components/kiosk/widgets";
import { useLiveEvents, useLiveMembers } from "@/lib/api/hooks";
import type { TBDEvent } from "@/lib/data";

function eventEpoch(event: TBDEvent): number {
  const raw = event.start_time ?? event.start;
  if (!raw) return Number.POSITIVE_INFINITY;
  if (raw.includes("T")) {
    const t = new Date(raw).getTime();
    return isNaN(t) ? Number.POSITIVE_INFINITY : t;
  }
  // HH:mm sample fixture — anchor to today so ordering remains deterministic.
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

export default function KioskTodayPage() {
  const { data: members } = useLiveMembers();
  const { data: events } = useLiveEvents();
  const widgetMembers = useWidgetMembers(members);

  const sortedEvents = useMemo(
    () => [...(events ?? [])].sort((a, b) => eventEpoch(a) - eventEpoch(b)),
    [events]
  );

  const now = Date.now();
  const upcoming = sortedEvents.find((e) => eventEpoch(e) >= now) ?? sortedEvents[0];

  return (
    <KioskPageShell
      activeId="today"
      heading="Today"
      subheading="Family at a glance"
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)",
          gap: 16,
        }}
      >
        <ClockWeatherWidget />
        <NextEventWidget event={upcoming} members={widgetMembers} />
      </div>
      <div style={{ minHeight: 0, flex: 1 }}>
        <AgendaListWidget
          events={sortedEvents}
          members={widgetMembers}
          limit={8}
        />
      </div>
      {/* Hide-from-screen reference to keep TB import live for any token-only edits. */}
      <span aria-hidden style={{ display: "none", color: TB.muted }} />
    </KioskPageShell>
  );
}

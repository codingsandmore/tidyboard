"use client";

/**
 * /kiosk/week — fixed Cozyla-style kiosk Week page (#83).
 *
 * Renders the 7-day calendar grid plus a flat agenda of all events in the
 * range. Uses live (no-fallback) hooks per #82.
 */

import { KioskPageShell } from "@/components/kiosk/kiosk-page-shell";
import { useWidgetMembers } from "@/components/kiosk/use-widget-members";
import {
  AgendaListWidget,
  WeekCalendarWidget,
} from "@/components/kiosk/widgets";
import { useLiveEvents, useLiveMembers } from "@/lib/api/hooks";

export default function KioskWeekPage() {
  const { data: members } = useLiveMembers();
  const { data: events } = useLiveEvents();
  const widgetMembers = useWidgetMembers(members);
  const evList = events ?? [];

  return (
    <KioskPageShell
      activeId="week"
      heading="This week"
      subheading="Plan, glance, switch by tap"
    >
      <WeekCalendarWidget events={evList} members={widgetMembers} />
      <div style={{ minHeight: 0, flex: 1 }}>
        <AgendaListWidget
          events={evList}
          members={widgetMembers}
          title="Upcoming"
          limit={10}
        />
      </div>
    </KioskPageShell>
  );
}

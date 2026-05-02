"use client";

/**
 * /kiosk/tasks — fixed Cozyla-style kiosk Tasks & Rewards page (#83).
 */

import { KioskPageShell } from "@/components/kiosk/kiosk-page-shell";
import { useWidgetMembers } from "@/components/kiosk/use-widget-members";
import {
  ChoreBoardWidget,
  RewardsWidget,
} from "@/components/kiosk/widgets";
import { useChores, useLiveMembers, useRewards } from "@/lib/api/hooks";

export default function KioskTasksPage() {
  const { data: members } = useLiveMembers();
  const { data: chores } = useChores();
  const { data: rewards } = useRewards();
  const widgetMembers = useWidgetMembers(members);

  return (
    <KioskPageShell
      activeId="tasks"
      heading="Tasks & rewards"
      subheading="What needs doing — and what it earns"
    >
      <ChoreBoardWidget chores={chores ?? []} members={widgetMembers} />
      <div style={{ minHeight: 0, flex: 1 }}>
        <RewardsWidget rewards={rewards ?? []} />
      </div>
    </KioskPageShell>
  );
}

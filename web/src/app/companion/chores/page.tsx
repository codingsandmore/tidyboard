"use client";

/**
 * /companion/chores — read-only chores list for the Companion PWA (#89).
 *
 * Phone-friendly digest of household chores grouped by member. Editing
 * flows live on /chores; this page exists so adults on the go can confirm
 * what is outstanding without unlocking the kiosk.
 */

import { useMemo } from "react";
import { MobileShell } from "@/components/companion/MobileShell";
import { useChores, useMembers } from "@/lib/api/hooks";
import { toWidgetMember } from "@/lib/family-roster";
import type { ApiChore } from "@/lib/api/types";
import type { Member } from "@/lib/data";

function memberLabel(
  members: Member[] | undefined,
  memberId: string | null | undefined
): string {
  if (!memberId || !members) return "Unassigned";
  const m = members.find((x) => x.id === memberId);
  return m ? toWidgetMember(m).name : "Unassigned";
}

export default function CompanionChoresPage() {
  const { data: chores } = useChores();
  const { data: members } = useMembers();

  const active: ApiChore[] = useMemo(
    () => (chores ?? []).filter((c) => !c.archived_at),
    [chores]
  );

  return (
    <MobileShell
      active="chores"
      heading="Chores"
      subheading={`${active.length} active`}
    >
      {active.length === 0 ? (
        <div data-testid="companion-chores-empty" style={{ color: "#6b7280" }}>
          No active chores.
        </div>
      ) : (
        <ul
          data-testid="companion-chores-list"
          style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 10 }}
        >
          {active.map((chore) => (
            <li
              key={chore.id}
              data-testid={`companion-chore-${chore.id}`}
              style={{
                padding: "14px 16px",
                borderRadius: 12,
                background: "#ffffff",
                border: "1px solid #ececeb",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: 16 }}>{chore.name}</div>
                <div style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>
                  {memberLabel(members, chore.member_id)} ·{" "}
                  {chore.frequency_kind ?? "ad hoc"}
                </div>
              </div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: chore.auto_approve ? "#4F7942" : "#a16207",
                  background: chore.auto_approve ? "#ecfdf5" : "#fef3c7",
                  padding: "4px 10px",
                  borderRadius: 999,
                }}
              >
                {chore.auto_approve ? "Auto" : "Approve"}
              </div>
            </li>
          ))}
        </ul>
      )}
    </MobileShell>
  );
}

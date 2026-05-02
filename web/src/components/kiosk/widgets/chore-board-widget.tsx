"use client";

import { TB } from "@/lib/tokens";
import type { ApiChore } from "@/lib/api/types";
import type { WidgetMember } from "@/lib/family-roster";
import { WidgetFrame, WidgetEmpty } from "./widget-frame";

/**
 * ChoreBoardWidget — kid-facing list of chores grouped by member, used on
 * the /kiosk/tasks page. Renders chore name + assigned-member dot.
 *
 * Pets are first-class members but excluded from the wallet/rewards layer
 * (per #82). The widget filters them out by role.
 */
export interface ChoreBoardWidgetProps {
  chores: ApiChore[];
  members: WidgetMember[];
  /** Max chores rendered per member column. */
  perMemberLimit?: number;
  "data-testid"?: string;
}

export function ChoreBoardWidget({
  chores,
  members,
  perMemberLimit = 5,
  ...rest
}: ChoreBoardWidgetProps) {
  const testId = rest["data-testid"] ?? "kiosk-chores";
  const eligibleMembers = members.filter((m) => m.role !== "pet");
  const choresByMember = new Map<string, ApiChore[]>();
  for (const chore of chores) {
    if (chore.archived_at) continue;
    const arr = choresByMember.get(chore.member_id) ?? [];
    arr.push(chore);
    choresByMember.set(chore.member_id, arr);
  }
  const total = chores.filter((c) => !c.archived_at).length;

  return (
    <WidgetFrame
      data-testid={testId}
      eyebrow="Tasks"
      title={`Chores (${total} active)`}
    >
      {total === 0 || eligibleMembers.length === 0 ? (
        <WidgetEmpty
          message="No chores yet"
          hint="Create chores from the chores screen."
          testId={`${testId}-empty`}
        />
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${Math.min(eligibleMembers.length, 4)}, minmax(0, 1fr))`,
            gap: 12,
          }}
        >
          {eligibleMembers.slice(0, 4).map((member) => {
            const memberChores = (choresByMember.get(member.id) ?? []).slice(
              0,
              perMemberLimit
            );
            return (
              <div
                key={member.id}
                data-testid={`kiosk-chores-column-${member.id}`}
                style={{
                  background: TB.bg2,
                  border: `1px solid ${TB.border}`,
                  borderRadius: TB.r.lg,
                  padding: 10,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: TB.r.full,
                      background: member.color,
                      color: "#fff",
                      fontSize: 11,
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {member.initials}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: TB.text }}>
                    {member.name}
                  </div>
                </div>
                {memberChores.length === 0 ? (
                  <div
                    style={{
                      fontSize: 12,
                      color: TB.muted,
                      padding: "6px 4px",
                    }}
                  >
                    No chores
                  </div>
                ) : (
                  <ul
                    style={{
                      listStyle: "none",
                      margin: 0,
                      padding: 0,
                      display: "flex",
                      flexDirection: "column",
                      gap: 4,
                    }}
                  >
                    {memberChores.map((chore) => (
                      <li
                        key={chore.id}
                        data-testid={`kiosk-chores-item-${chore.id}`}
                        style={{
                          fontSize: 13,
                          color: TB.text,
                          padding: "6px 8px",
                          background: TB.surface,
                          borderRadius: TB.r.sm,
                          borderLeft: `3px solid ${member.color}`,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {chore.name}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}
    </WidgetFrame>
  );
}

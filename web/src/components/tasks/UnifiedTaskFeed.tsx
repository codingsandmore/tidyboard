"use client";

/**
 * Unified task feed (issue #85).
 *
 * Renders all task-flavored sources (to-dos, routines, chores, rewards,
 * approvals) in one scrollable list with a member chip filter. This is
 * a read-only projection — completion / approval actions stay on the
 * existing per-source screens.
 */
import { useMemo, useState } from "react";
import { TB } from "@/lib/tokens";
import {
  unifyTasks,
  filterTasksByMember,
  type UnifiedTask,
  type UnifiedTaskKind,
} from "@/lib/unified-tasks";
import {
  useMembers,
  useChores,
  useRoutines,
  useAdHocTasks,
  useRewards,
  useRedemptions,
} from "@/lib/api/hooks";

const KIND_LABEL: Record<UnifiedTaskKind, string> = {
  approval: "Approval",
  todo: "To-do",
  routine: "Routine",
  chore: "Chore",
  reward: "Reward",
};

const KIND_COLOR: Record<UnifiedTaskKind, string> = {
  approval: "#E04444",
  todo: "#4A90E2",
  routine: "#7B4FE0",
  chore: "#1F8A4F",
  reward: "#E0A14F",
};

export interface UnifiedTaskFeedProps {
  /** Optional pre-selected member; when set the chip filter starts narrowed. */
  initialMemberId?: string;
}

export function UnifiedTaskFeed({ initialMemberId }: UnifiedTaskFeedProps) {
  const { data: members = [] } = useMembers();
  const { data: chores = [] } = useChores();
  const { data: routines = [] } = useRoutines();
  const { data: todos = [] } = useAdHocTasks();
  const { data: rewards = [] } = useRewards({ onlyActive: true });
  const { data: redemptions = [] } = useRedemptions();

  const [filterMember, setFilterMember] = useState<string | undefined>(
    initialMemberId,
  );

  // Pets stay in the roster but are excluded from the chip row — the
  // unified feed never assigns wallet/reward work to a pet (see #82).
  const filterableMembers = useMemo(
    () =>
      members.filter(
        (m) => m.role !== "pet" && (m.age_group ?? "adult") !== "pet",
      ),
    [members],
  );

  const all = useMemo<UnifiedTask[]>(
    () =>
      unifyTasks({
        members,
        chores,
        routines,
        todos,
        rewards,
        redemptions,
      }),
    [members, chores, routines, todos, rewards, redemptions],
  );

  const visible = useMemo(
    () => filterTasksByMember(all, filterMember),
    [all, filterMember],
  );

  return (
    <div
      data-testid="unified-task-feed"
      style={{
        width: "100%",
        background: TB.bg,
        fontFamily: TB.fontBody,
        padding: 16,
        boxSizing: "border-box",
      }}
    >
      <div
        role="toolbar"
        aria-label="Filter tasks by member"
        style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}
      >
        <Chip
          label="Everyone"
          color={TB.text}
          active={!filterMember}
          onClick={() => setFilterMember(undefined)}
        />
        {filterableMembers.map((m) => (
          <Chip
            key={m.id}
            label={m.name ?? m.display_name ?? "Member"}
            color={m.color ?? TB.primary}
            active={filterMember === m.id}
            onClick={() =>
              setFilterMember(filterMember === m.id ? undefined : m.id)
            }
          />
        ))}
      </div>

      {visible.length === 0 ? (
        <div
          role="status"
          style={{
            padding: 16,
            color: TB.text2,
            border: `1px dashed ${TB.border}`,
            borderRadius: 8,
            textAlign: "center",
          }}
        >
          Nothing to do here.
        </div>
      ) : (
        <ul
          aria-label="Unified task list"
          style={{
            listStyle: "none",
            margin: 0,
            padding: 0,
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          {visible.map((t) => (
            <li
              key={t.id}
              data-testid={`task-row-${t.kind}`}
              data-task-id={t.id}
              style={{
                display: "grid",
                gridTemplateColumns: "92px 1fr auto",
                gap: 10,
                padding: 10,
                background: TB.surface,
                border: `1px solid ${TB.border}`,
                borderRadius: 8,
                alignItems: "center",
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: KIND_COLOR[t.kind],
                  textTransform: "uppercase",
                  letterSpacing: 0.4,
                }}
              >
                {KIND_LABEL[t.kind]}
              </span>
              <span style={{ fontSize: 14, color: TB.text }}>{t.title}</span>
              {t.kind === "reward" && t.rewardState ? (
                <span
                  style={{
                    fontSize: 11,
                    color: TB.text2,
                    textTransform: "capitalize",
                  }}
                >
                  {t.rewardState.replace("_", " ")}
                </span>
              ) : (
                <span />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Chip({
  label,
  color,
  active,
  onClick,
}: {
  label: string;
  color: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      style={{
        padding: "6px 12px",
        borderRadius: 999,
        border: `1px solid ${active ? color : TB.border}`,
        background: active ? color : TB.surface,
        color: active ? "#fff" : TB.text,
        fontSize: 12,
        fontWeight: 600,
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}

export default UnifiedTaskFeed;

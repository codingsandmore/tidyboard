"use client";

/**
 * Admin Time Review.
 *
 * Lists chore time entries grouped by member with edit/delete buttons.
 * Reads from the unscoped `/v1/time-entries` endpoint via
 * `useChoreTimeEntries` plus member metadata from `useMembers`.
 *
 * Spec: docs/specs/2026-05-01-fairplay-design.md §F.3.
 * Backend: internal/handler/chore_time_entries.go (#134).
 */

import { useMemo, useState } from "react";
import { AuthGate } from "@/components/auth-gate";
import { AdminGate } from "@/components/admin-gate";
import { TB } from "@/lib/tokens";
import { H } from "@/components/ui/heading";
import {
  useMembers,
  useChores,
  useChoreTimeEntries,
  useUpdateTimeEntry,
  useDeleteTimeEntry,
} from "@/lib/api/hooks";
import type { ApiChoreTimeEntry, Member, ApiChore } from "@/lib/api/types";

function formatDuration(seconds: number | null): string {
  if (seconds == null) return "—";
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m ${sec}s`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

function entryDurationSeconds(e: ApiChoreTimeEntry): number | null {
  if (typeof e.duration_seconds === "number") return e.duration_seconds;
  if (e.started_at && e.ended_at) {
    return Math.round((Date.parse(e.ended_at) - Date.parse(e.started_at)) / 1000);
  }
  return null;
}

function memberName(members: Member[] | undefined, id: string): string {
  return members?.find((m) => m.id === id)?.name ?? id.slice(0, 8);
}

function choreName(chores: ApiChore[] | undefined, id: string): string {
  return chores?.find((c) => c.id === id)?.name ?? "(unknown chore)";
}

interface EditingState {
  id: string;
  durationMinutes: number;
  note: string;
}

/**
 * Inner page component (exported for tests). Wraps in AuthGate + AdminGate
 * via the default route export.
 */
export function TimeReviewPage() {
  const { data: members } = useMembers();
  const { data: chores } = useChores();
  const { data: entries = [], isLoading, error } = useChoreTimeEntries();
  const update = useUpdateTimeEntry();
  const remove = useDeleteTimeEntry();
  const [editing, setEditing] = useState<EditingState | null>(null);

  const grouped = useMemo(() => {
    const out = new Map<string, ApiChoreTimeEntry[]>();
    for (const e of entries) {
      const arr = out.get(e.member_id) ?? [];
      arr.push(e);
      out.set(e.member_id, arr);
    }
    for (const [, arr] of out) {
      arr.sort((a, b) => Date.parse(b.started_at) - Date.parse(a.started_at));
    }
    return out;
  }, [entries]);

  function startEdit(e: ApiChoreTimeEntry) {
    const dur = entryDurationSeconds(e);
    setEditing({
      id: e.id,
      durationMinutes: dur != null ? Math.max(1, Math.round(dur / 60)) : 1,
      note: e.note ?? "",
    });
  }

  function commitEdit(original: ApiChoreTimeEntry) {
    if (!editing) return;
    const startedAt = original.started_at;
    const startedMs = Date.parse(startedAt);
    if (!Number.isFinite(startedMs)) {
      setEditing(null);
      return;
    }
    const newEndedAt = new Date(startedMs + editing.durationMinutes * 60_000).toISOString();
    update.mutate(
      { id: editing.id, endedAt: newEndedAt, note: editing.note },
      { onSuccess: () => setEditing(null) }
    );
  }

  function handleDelete(e: ApiChoreTimeEntry) {
    if (typeof window !== "undefined" && !window.confirm("Delete this time entry?")) return;
    remove.mutate({ id: e.id });
  }

  return (
    <div
      style={{
        width: "100%",
        minHeight: "100vh",
        background: TB.bg,
        fontFamily: TB.fontBody,
        padding: 24,
        boxSizing: "border-box",
      }}
    >
      <H as="h1" style={{ fontSize: 24, color: TB.text, marginBottom: 16 }}>
        Time review
      </H>
      <p style={{ fontSize: 13, color: TB.text2, marginTop: 0, marginBottom: 16 }}>
        Review chore time entries grouped by member. Admins may edit duration or delete a stray entry.
      </p>
      {isLoading && <div style={{ color: TB.text2 }}>Loading entries…</div>}
      {error && (
        <div role="alert" style={{ color: TB.destructive }}>
          Failed to load time entries: {(error as Error).message}
        </div>
      )}
      {!isLoading && !error && entries.length === 0 && (
        <div style={{ color: TB.text2 }}>No time entries yet.</div>
      )}
      {Array.from(grouped.entries()).map(([mid, list]) => (
        <section
          key={mid}
          aria-label={`Entries for ${memberName(members, mid)}`}
          style={{
            background: TB.surface,
            border: `1px solid ${TB.border}`,
            borderRadius: 12,
            padding: 16,
            marginBottom: 16,
          }}
        >
          <H as="h2" style={{ fontSize: 18, marginTop: 0, marginBottom: 8 }}>
            {memberName(members, mid)}
          </H>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {list.map((e) => {
              const dur = entryDurationSeconds(e);
              const isEditing = editing?.id === e.id;
              return (
                <div
                  key={e.id}
                  data-testid={`entry-row-${e.id}`}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto auto auto auto",
                    alignItems: "center",
                    gap: 8,
                    padding: 8,
                    border: `1px solid ${TB.border}`,
                    borderRadius: 8,
                    background: TB.bg,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{choreName(chores, e.chore_id)}</div>
                    <div style={{ fontSize: 11, color: TB.text2 }}>
                      {new Date(e.started_at).toLocaleString()} · {e.source}
                    </div>
                  </div>
                  {isEditing ? (
                    <>
                      <label style={{ fontSize: 11, color: TB.text2 }}>
                        min{" "}
                        <input
                          type="number"
                          aria-label={`Duration minutes for ${e.id}`}
                          value={editing.durationMinutes}
                          min={1}
                          onChange={(ev) =>
                            setEditing({
                              ...editing,
                              durationMinutes: Number.parseInt(ev.target.value, 10) || 1,
                            })
                          }
                          style={{
                            width: 64,
                            padding: 4,
                            border: `1px solid ${TB.border}`,
                            borderRadius: 4,
                          }}
                        />
                      </label>
                      <input
                        type="text"
                        aria-label={`Note for ${e.id}`}
                        value={editing.note}
                        onChange={(ev) => setEditing({ ...editing, note: ev.target.value })}
                        style={{
                          width: 140,
                          padding: 4,
                          border: `1px solid ${TB.border}`,
                          borderRadius: 4,
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => commitEdit(e)}
                        style={{
                          padding: "6px 10px",
                          borderRadius: 6,
                          border: "none",
                          background: TB.primary,
                          color: "#fff",
                          fontWeight: 600,
                          fontSize: 12,
                          cursor: "pointer",
                        }}
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditing(null)}
                        style={{
                          padding: "6px 10px",
                          borderRadius: 6,
                          border: `1px solid ${TB.border}`,
                          background: TB.surface,
                          color: TB.text2,
                          fontWeight: 600,
                          fontSize: 12,
                          cursor: "pointer",
                        }}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize: 13, fontVariantNumeric: "tabular-nums" }}>
                        {formatDuration(dur)}
                      </div>
                      <div style={{ fontSize: 11, color: TB.text2, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {e.note || ""}
                      </div>
                      <button
                        type="button"
                        aria-label={`Edit entry ${e.id}`}
                        onClick={() => startEdit(e)}
                        style={{
                          padding: "6px 10px",
                          borderRadius: 6,
                          border: `1px solid ${TB.border}`,
                          background: TB.surface,
                          color: TB.text,
                          fontWeight: 600,
                          fontSize: 12,
                          cursor: "pointer",
                        }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        aria-label={`Delete entry ${e.id}`}
                        onClick={() => handleDelete(e)}
                        style={{
                          padding: "6px 10px",
                          borderRadius: 6,
                          border: "none",
                          background: TB.destructive,
                          color: "#fff",
                          fontWeight: 600,
                          fontSize: 12,
                          cursor: "pointer",
                        }}
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

export default function TimeReviewRoute() {
  return (
    <AuthGate>
      <AdminGate>
        <TimeReviewPage />
      </AdminGate>
    </AuthGate>
  );
}

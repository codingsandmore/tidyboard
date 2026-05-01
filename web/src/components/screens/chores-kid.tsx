"use client";

import { useMemo, useState } from "react";
import confetti from "canvas-confetti";
import { TB } from "@/lib/tokens";
import { Icon } from "@/components/ui/icon";
import { H } from "@/components/ui/heading";
import { MoneyDisplay } from "@/components/ui/money-display";
import { StreakIndicator } from "@/components/ui/streak-indicator";
import {
  useChores,
  useChoreCompletions,
  useMarkChoreComplete,
  useMembers,
  useAllowance,
  useStartChoreTimer,
  useStopChoreTimer,
} from "@/lib/api/hooks";
import { perInstancePayout, weeklyDivisor } from "@/lib/wallet/payout-math";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function startOfWeek(d: Date): Date {
  const start = new Date(d);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - start.getDay());
  return start;
}

function fmtDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function freqPerWeek(kind: string, days: string[]): number {
  switch (kind) {
    case "daily": return 7;
    case "weekdays": return 5;
    case "specific_days": return days.length;
    case "weekly": return 1;
  }
  return 0;
}

/** Format a duration in seconds as `Hh Mm Ss` (drops zero leading parts). */
function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m ${sec}s`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

/** Per-chore timer state held locally on the kid screen. We mirror the
 *  open entry from the start mutation so the UI can show Stop without
 *  another fetch round-trip. */
interface TimerState {
  /** Started timer entry id (returned by /timer/start). */
  entryId: string;
  /** Wall-clock start time, ms since epoch. */
  startedAt: number;
  /** Last completed-stop duration in seconds, if any. */
  lastDurationSeconds?: number;
  /** Inline error after a 409 etc. */
  errorMessage?: string;
  /** True after stop while we are awaiting a Mark-complete confirmation. */
  awaitingComplete?: boolean;
}

export function ChoresKid({ memberId }: { memberId: string }) {
  const { data: chores = [] } = useChores({ memberId });
  const { data: members } = useMembers();
  const { data: allowances } = useAllowance();

  const member = members?.find((m) => m.id === memberId);
  const color = member?.color ?? TB.primary;

  const weekStart = useMemo(() => startOfWeek(new Date()), []);
  const weekEnd = useMemo(() => {
    const d = new Date(weekStart); d.setDate(d.getDate() + 6); return d;
  }, [weekStart]);

  const { data: completions = [] } = useChoreCompletions({
    from: fmtDate(weekStart),
    to: fmtDate(weekEnd),
    memberId,
  });
  const mark = useMarkChoreComplete();
  const startTimer = useStartChoreTimer();
  const stopTimer = useStopChoreTimer();

  // Per-chore timer state. Keyed by chore id so multiple timers can be
  // tracked even though the backend forbids overlapping entries for the
  // same caller.
  const [timers, setTimers] = useState<Record<string, TimerState>>({});

  const allowance = allowances?.find((a) => a.member_id === memberId)?.amount_cents ?? 0;
  const divisor = weeklyDivisor(chores.map((c) => c.weight), chores.map((c) => freqPerWeek(c.frequency_kind, c.days_of_week)));

  function isCompleted(choreId: string, dayDate: Date): boolean {
    return completions.some((c) => c.chore_id === choreId && c.date === fmtDate(dayDate));
  }

  function handleTap(choreId: string, dayDate: Date) {
    if (isCompleted(choreId, dayDate)) return;
    mark.mutate(
      { choreId, date: fmtDate(dayDate) },
      {
        onSuccess: () => {
          confetti({ particleCount: 60, spread: 60, origin: { y: 0.7 } });
        },
      }
    );
  }

  function handleStart(choreId: string) {
    setTimers((prev) => ({
      ...prev,
      [choreId]: { ...(prev[choreId] ?? { entryId: "", startedAt: 0 }), errorMessage: undefined },
    }));
    startTimer.mutate(
      { choreId },
      {
        onSuccess: (entry) => {
          const startedMs = entry.started_at ? Date.parse(entry.started_at) : Date.now();
          setTimers((prev) => ({
            ...prev,
            [choreId]: {
              entryId: entry.id,
              startedAt: Number.isFinite(startedMs) ? startedMs : Date.now(),
              awaitingComplete: false,
            },
          }));
        },
        onError: (err: unknown) => {
          const e = err as { code?: string; message?: string };
          const friendly =
            e?.code === "timer_already_running"
              ? "A timer is already running for this chore."
              : e?.message ?? "Could not start timer. Please try again.";
          setTimers((prev) => ({
            ...prev,
            [choreId]: { ...(prev[choreId] ?? { entryId: "", startedAt: 0 }), errorMessage: friendly },
          }));
        },
      }
    );
  }

  function handleStop(choreId: string) {
    stopTimer.mutate(
      { choreId },
      {
        onSuccess: (entry) => {
          const dur =
            typeof entry.duration_seconds === "number"
              ? entry.duration_seconds
              : entry.started_at && entry.ended_at
                ? Math.round((Date.parse(entry.ended_at) - Date.parse(entry.started_at)) / 1000)
                : undefined;
          setTimers((prev) => ({
            ...prev,
            [choreId]: {
              entryId: "",
              startedAt: 0,
              lastDurationSeconds: dur,
              awaitingComplete: true,
            },
          }));
        },
        onError: (err: unknown) => {
          const e = err as { code?: string; message?: string };
          setTimers((prev) => ({
            ...prev,
            [choreId]: {
              ...(prev[choreId] ?? { entryId: "", startedAt: 0 }),
              errorMessage: e?.message ?? "Could not stop timer.",
            },
          }));
        },
      }
    );
  }

  function handleConfirmComplete(choreId: string) {
    const today = new Date();
    mark.mutate(
      { choreId, date: fmtDate(today) },
      {
        onSuccess: () => {
          confetti({ particleCount: 60, spread: 60, origin: { y: 0.7 } });
          setTimers((prev) => ({
            ...prev,
            [choreId]: { entryId: "", startedAt: 0, awaitingComplete: false },
          }));
        },
      }
    );
  }

  function handleDismissComplete(choreId: string) {
    setTimers((prev) => ({
      ...prev,
      [choreId]: { entryId: "", startedAt: 0, awaitingComplete: false },
    }));
  }

  return (
    <div style={{ width: "100%", height: "100%", background: TB.bg, fontFamily: TB.fontBody, padding: 16, boxSizing: "border-box", overflow: "auto" }}>
      <H as="h2" style={{ fontSize: 20, color }}>{member?.name ?? "Chores"}</H>
      <div style={{ display: "grid", gridTemplateColumns: "210px repeat(7, 1fr)", gap: 4, marginTop: 12 }}>
        <div />
        {DAYS.map((d, i) => {
          const dt = new Date(weekStart); dt.setDate(dt.getDate() + i);
          return (
            <div key={d} style={{ textAlign: "center", fontSize: 11, color: TB.text2, fontWeight: 600 }}>
              {d}<br/>{dt.getDate()}
            </div>
          );
        })}
        {chores.map((c) => {
          const freq = freqPerWeek(c.frequency_kind, c.days_of_week);
          const payout = perInstancePayout(allowance, c.weight, divisor);
          const completedThisWeek = DAYS.reduce((acc, _, i) => {
            const dt = new Date(weekStart); dt.setDate(dt.getDate() + i);
            return acc + (isCompleted(c.id, dt) ? 1 : 0);
          }, 0);
          const hot = completedThisWeek >= freq && freq > 0;
          const t = timers[c.id];
          const running = Boolean(t?.entryId);
          return (
            <div key={c.id} style={{ display: "contents" }}>
              <div style={{ display: "flex", flexDirection: "column", padding: 8, background: TB.surface, border: `1px solid ${TB.border}`, borderRadius: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{c.name}</div>
                <div style={{ fontSize: 10, color: TB.text2, marginTop: 2 }}>
                  weight {c.weight} · <MoneyDisplay cents={payout} size="sm" />
                </div>
                <div style={{ marginTop: 4 }}>
                  <StreakIndicator count={completedThisWeek} max={freq} color={color} />
                </div>
                <button
                  type="button"
                  aria-label={running ? `Stop timer for ${c.name}` : `Start timer for ${c.name}`}
                  onClick={() => (running ? handleStop(c.id) : handleStart(c.id))}
                  style={{
                    marginTop: 8,
                    padding: "10px 12px",
                    minHeight: 40,
                    borderRadius: 8,
                    border: "none",
                    background: running ? TB.destructive : color,
                    color: "#fff",
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                  }}
                >
                  <Icon name={running ? "x" : "check"} size={14} color="#fff" stroke={3} />
                  {running ? "Stop" : "Start"}
                </button>
                {t?.errorMessage && (
                  <div role="alert" style={{ marginTop: 6, fontSize: 11, color: TB.destructive }}>
                    {t.errorMessage}
                  </div>
                )}
                {t?.awaitingComplete && (
                  <div
                    role="dialog"
                    aria-label={`Mark ${c.name} complete`}
                    style={{
                      marginTop: 6,
                      padding: 8,
                      background: TB.bg,
                      border: `1px solid ${TB.border}`,
                      borderRadius: 6,
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                    }}
                  >
                    <div style={{ fontSize: 12, color: TB.text }}>
                      {typeof t.lastDurationSeconds === "number"
                        ? `Logged ${formatDuration(t.lastDurationSeconds)}. `
                        : ""}
                      Mark complete?
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        type="button"
                        aria-label={`Yes, mark complete for ${c.name}`}
                        onClick={() => handleConfirmComplete(c.id)}
                        style={{
                          flex: 1,
                          padding: "6px 8px",
                          borderRadius: 6,
                          border: "none",
                          background: color,
                          color: "#fff",
                          fontWeight: 600,
                          fontSize: 11,
                          cursor: "pointer",
                        }}
                      >
                        Yes, mark complete
                      </button>
                      <button
                        type="button"
                        aria-label={`Not yet for ${c.name}`}
                        onClick={() => handleDismissComplete(c.id)}
                        style={{
                          padding: "6px 8px",
                          borderRadius: 6,
                          border: `1px solid ${TB.border}`,
                          background: TB.surface,
                          color: TB.text2,
                          fontWeight: 600,
                          fontSize: 11,
                          cursor: "pointer",
                        }}
                      >
                        Not yet
                      </button>
                    </div>
                  </div>
                )}
              </div>
              {DAYS.map((_, i) => {
                const dt = new Date(weekStart); dt.setDate(dt.getDate() + i);
                const done = isCompleted(c.id, dt);
                return (
                  <div
                    key={`${c.id}-${i}`}
                    role="button"
                    aria-label={`${c.name} ${DAYS[i]}`}
                    onClick={() => handleTap(c.id, dt)}
                    style={{
                      minHeight: 56,
                      borderRadius: 8,
                      border: `1px solid ${TB.border}`,
                      background: done ? color + "33" : TB.surface,
                      boxShadow: hot && done ? `0 0 0 2px ${color}` : "none",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                    }}
                  >
                    {done && <Icon name="check" size={20} color={color} stroke={3} />}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

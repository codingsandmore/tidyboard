"use client";

import { useMemo } from "react";
import confetti from "canvas-confetti";
import { TB } from "@/lib/tokens";
import { Icon } from "@/components/ui/icon";
import { H } from "@/components/ui/heading";
import { MoneyDisplay } from "@/components/ui/money-display";
import { StreakIndicator } from "@/components/ui/streak-indicator";
import { useChores, useChoreCompletions, useMarkChoreComplete, useMembers, useAllowance } from "@/lib/api/hooks";
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

  return (
    <div style={{ width: "100%", height: "100%", background: TB.bg, fontFamily: TB.fontBody, padding: 16, boxSizing: "border-box", overflow: "auto" }}>
      <H as="h2" style={{ fontSize: 20, color }}>{member?.name ?? "Chores"}</H>
      <div style={{ display: "grid", gridTemplateColumns: "150px repeat(7, 1fr)", gap: 4, marginTop: 12 }}>
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

"use client";

import { useEffect, useState } from "react";
import { TB } from "@/lib/tokens";
import { TBD, getMember } from "@/lib/data";
import { Icon } from "@/components/ui/icon";
import { Avatar } from "@/components/ui/avatar";
import { H } from "@/components/ui/heading";
import { useRoutines, useMarkStepComplete, useStreak } from "@/lib/api/hooks";
import type { ApiRoutineStep } from "@/lib/api/types";
import { useTranslations } from "next-intl";
import { PhotoSlideshow } from "@/components/photo-slideshow";

// ═══════ Routine — kid hero (primary variation) ═══════
export function RoutineKid({ dark = false }: { dark?: boolean }) {
  const t = useTranslations("routine");
  const { data: routines } = useRoutines();
  const markComplete = useMarkStepComplete();

  const apiRoutine = routines?.[0];
  const activeMemberId = apiRoutine?.member_id ?? "";

  // streak from backend
  const { data: streakData } = useStreak(apiRoutine?.id ?? "", activeMemberId);
  const streakCount = streakData?.streak ?? 0;

  // Local optimistic step state
  const [doneSteps, setDoneSteps] = useState<Set<string>>(new Set());

  // Re-seed when routine changes
  const [lastRoutineId, setLastRoutineId] = useState<string | null>(null);
  if (apiRoutine && apiRoutine.id !== lastRoutineId) {
    setDoneSteps(new Set());
    setLastRoutineId(apiRoutine.id);
  }

  const bg = dark ? TB.dBg : "#F7F9F3";
  const surf = dark ? TB.dElevated : TB.surface;
  const tc = dark ? TB.dText : TB.text;
  const tc2 = dark ? TB.dText2 : TB.text2;
  const border = dark ? TB.dBorder : TB.border;

  if (!apiRoutine) {
    return (
      <div style={{ width: "100%", height: "100%", background: bg, color: tc, fontFamily: TB.fontBody, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 10 }}>
        <H as="h2" style={{ color: tc2, fontSize: 20 }}>{t("noRoutineYet")}</H>
      </div>
    );
  }

  const member = getMember(apiRoutine.member_id ?? "");
  const steps: ApiRoutineStep[] = apiRoutine.steps ?? [];
  const progress = doneSteps.size;
  const total = steps.length;
  const pct = total > 0 ? progress / total : 0;
  // est minutes left
  const minutesLeft = steps
    .filter((s) => !doneSteps.has(s.id))
    .reduce((sum, s) => sum + (s.est_minutes ?? 0), 0);

  function handleTapStep(step: ApiRoutineStep) {
    const wasDone = doneSteps.has(step.id);
    setDoneSteps((prev) => {
      const next = new Set(prev);
      if (wasDone) next.delete(step.id);
      else next.add(step.id);
      return next;
    });
    if (!wasDone && activeMemberId) {
      markComplete.mutate({
        routineId: apiRoutine!.id,
        req: { step_id: step.id, member_id: activeMemberId },
      });
    }
  }

  return (
    <div style={{ width: "100%", height: "100%", background: bg, color: tc, fontFamily: TB.fontBody, display: "flex", flexDirection: "column", padding: 24, boxSizing: "border-box", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <Avatar member={member} size={64} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, color: tc2, fontWeight: 600, letterSpacing: "0.04em" }}>{t("goodMorning")}</div>
          <H as="h1" style={{ color: member.color, fontSize: 34, marginTop: 2, fontFamily: TB.fontDisplay }}>{apiRoutine.name}</H>
        </div>
        <div style={{ background: member.color + "18", color: member.color, padding: "10px 14px", borderRadius: 14, textAlign: "center" }}>
          <div style={{ fontFamily: TB.fontDisplay, fontSize: 28, fontWeight: 600, lineHeight: 1 }}>{progress}<span style={{ fontSize: 18, opacity: 0.6 }}>/{total}</span></div>
          <div style={{ fontSize: 10, letterSpacing: "0.05em", marginTop: 2 }}>{t("done")}</div>
        </div>
      </div>

      {/* Progress bar */}
      <div>
        <div style={{ height: 14, borderRadius: 9999, background: dark ? TB.dBg2 : "#E7E9E3", overflow: "hidden", position: "relative" }}>
          <div style={{ height: "100%", width: `${pct * 100}%`, background: `linear-gradient(90deg, ${member.color}, ${member.color}dd)`, borderRadius: 9999 }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 12, color: tc2 }}>
          <span>{t("keepGoing", { pct: Math.round(pct * 100) })}</span>
          <span style={{ color: TB.warning, fontWeight: 600 }}>⏱ {t("minLeft", { n: minutesLeft })}</span>
        </div>
      </div>

      {/* Steps */}
      <div style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
        {steps.map((s, idx) => {
          const done = doneSteps.has(s.id);
          // "active" = first undone step
          const active = !done && steps.findIndex((x) => !doneSteps.has(x.id)) === idx;
          return (
            <div
              key={s.id}
              onClick={() => handleTapStep(s)}
              style={{
                background: done ? (dark ? TB.dBg2 : "#EEF1EB") : surf,
                border: active ? `3px solid ${member.color}` : `1px solid ${border}`,
                borderRadius: 16,
                padding: "16px 18px",
                display: "flex", alignItems: "center", gap: 16,
                minHeight: 64,
                opacity: done ? 0.55 : 1,
                boxShadow: active ? `0 0 0 4px ${member.color}22, 0 8px 24px ${member.color}22` : "none",
                transform: active ? "scale(1.02)" : "none",
                transition: "all .25s",
                cursor: "pointer",
              }}
            >
              <div style={{
                width: 44, height: 44, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center",
                background: done ? TB.success : (active ? member.color : (dark ? TB.dBg2 : TB.bg2)),
                fontSize: 24,
              }}>
                {done ? <Icon name="check" size={22} color="#fff" stroke={3} /> : (s.icon ?? "✅")}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: 20, fontWeight: 600, color: tc,
                  textDecoration: done ? "line-through" : "none",
                }}>{s.name}</div>
                {active && <div style={{ fontSize: 12, color: member.color, fontWeight: 600, marginTop: 2 }}>👆 You&apos;re on this one</div>}
              </div>
              {s.est_minutes != null && (
                <div style={{ fontFamily: TB.fontMono, fontSize: 13, color: tc2, padding: "4px 10px", background: done ? "transparent" : (dark ? TB.dBg : TB.bg2), borderRadius: 6 }}>
                  {s.est_minutes} min
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Streak footer */}
      <div style={{ background: surf, borderRadius: 16, padding: 16, display: "flex", alignItems: "center", gap: 12, border: `1px solid ${border}` }}>
        <div style={{ width: 44, height: 44, borderRadius: "50%", background: TB.warning + "22", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon name="star" size={24} color={TB.warning} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: TB.fontDisplay, fontSize: 24, fontWeight: 600 }}>{t("starsCount", { n: member.stars })}</div>
          <div style={{ fontSize: 12, color: tc2 }}>{t("earnMore")}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4, background: "#F97316", color: "#fff", padding: "6px 10px", borderRadius: 9999 }}>
          <Icon name="flame" size={14} />
          <div style={{ fontSize: 13, fontWeight: 600 }}>{t("streakDays", { n: streakCount })}</div>
        </div>
      </div>
    </div>
  );
}

// ═══════ Routine V2 — checklist simple ═══════
export function RoutineChecklist() {
  const t = useTranslations("routine");
  const r = TBD.routine;
  const member = getMember(r.member);
  return (
    <div style={{ width: "100%", height: "100%", background: member.color, color: "#fff", fontFamily: TB.fontBody, padding: 0, boxSizing: "border-box", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "28px 24px 16px" }}>
        <div style={{ fontSize: 12, opacity: 0.85, letterSpacing: "0.1em" }}>JACKSON · {t("goodMorning")}</div>
        <H as="h1" style={{ fontFamily: TB.fontDisplay, fontSize: 38, color: "#fff", marginTop: 6 }}>{t("letsGetReady")}</H>
        <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ flex: 1, height: 10, background: "rgba(255,255,255,0.25)", borderRadius: 9999, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${r.progress / r.total * 100}%`, background: "#fff", borderRadius: 9999 }} />
          </div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{r.progress}/{r.total}</div>
        </div>
      </div>
      <div style={{ flex: 1, background: "#fff", borderRadius: "24px 24px 0 0", padding: 20, color: TB.text, overflow: "auto" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {r.steps.map((s) => (
            <div key={s.id} style={{
              padding: "14px 16px", borderRadius: 14,
              background: s.done ? "#F5F5F4" : "#fff",
              border: s.active ? `2px dashed ${member.color}` : `1px solid ${TB.borderSoft}`,
              display: "flex", alignItems: "center", gap: 14,
              opacity: s.done ? 0.6 : 1,
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%",
                border: `2px solid ${s.done ? TB.success : member.color}`,
                background: s.done ? TB.success : "transparent",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {s.done && <Icon name="check" size={16} color="#fff" stroke={3} />}
              </div>
              <div style={{ fontSize: 24 }}>{s.emoji}</div>
              <div style={{ fontSize: 18, fontWeight: 600, flex: 1, textDecoration: s.done ? "line-through" : "none" }}>{s.name}</div>
              <div style={{ fontSize: 11, color: TB.text2, fontFamily: TB.fontMono }}>{s.min}m</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════ Routine V3 — path / journey ═══════
export function RoutinePath() {
  const t = useTranslations("routine");
  const r = TBD.routine;
  const member = getMember(r.member);
  return (
    <div style={{ width: "100%", height: "100%", background: "linear-gradient(170deg, #F7F9F3 0%, #EEF1EB 100%)", fontFamily: TB.fontBody, padding: 24, boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <Avatar member={member} size={54} />
        <div>
          <H as="h2" style={{ fontFamily: TB.fontDisplay, color: member.color, fontSize: 26 }}>Jackson&apos;s Journey</H>
          <div style={{ fontSize: 12, color: TB.text2 }}>{t("halfwayThere", { n: 15 })}</div>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ background: "#fff", padding: "10px 14px", borderRadius: 14, display: "flex", alignItems: "center", gap: 6, boxShadow: TB.shadow }}>
          <Icon name="star" size={18} color={TB.warning} />
          <div style={{ fontWeight: 700, fontFamily: TB.fontDisplay, fontSize: 20 }}>{member.stars}</div>
        </div>
      </div>

      <div style={{ flex: 1, position: "relative", display: "flex", flexDirection: "column", justifyContent: "space-around", padding: "10px 0" }}>
        {/* SVG curvy path */}
        <svg style={{ position: "absolute", inset: 0, pointerEvents: "none" }} viewBox="0 0 300 500" preserveAspectRatio="none">
          <path d="M 60 30 Q 260 90, 80 180 T 220 330 T 80 480" stroke={member.color} strokeWidth="4" strokeDasharray="6 8" fill="none" opacity="0.35" />
        </svg>
        {r.steps.map((s, i) => {
          const leftSide = i % 2 === 0;
          return (
            <div key={s.id} style={{
              display: "flex", alignItems: "center", gap: 14,
              flexDirection: leftSide ? "row" : "row-reverse",
              padding: "0 12px", zIndex: 1,
            }}>
              <div style={{
                width: 48, height: 48, borderRadius: "50%",
                background: s.done ? TB.success : (s.active ? member.color : "#fff"),
                border: s.active ? `3px solid ${member.color}` : `2px solid ${s.done ? TB.success : TB.border}`,
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
                boxShadow: s.active ? `0 0 0 6px ${member.color}22` : TB.shadow,
              }}>
                {s.done ? <Icon name="check" size={22} color="#fff" stroke={3} /> : s.emoji}
              </div>
              <div style={{
                background: "#fff", padding: "10px 14px", borderRadius: 12, boxShadow: TB.shadow,
                border: s.active ? `2px solid ${member.color}` : `1px solid ${TB.border}`,
                opacity: s.done ? 0.55 : 1,
                minWidth: 140,
              }}>
                <div style={{ fontSize: 15, fontWeight: 600, textDecoration: s.done ? "line-through" : "none" }}>{s.name}</div>
                <div style={{ fontSize: 11, color: TB.text2, fontFamily: TB.fontMono }}>{s.min} min</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════ Kiosk Lock Screen (photo slideshow + clock) ═══════
export function KioskLock() {
  const t = useTranslations("lock");
  const [now, setNow] = useState<Date>(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);
  const timeStr = now.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    hour12: false,
  });
  const dateStr = now.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  return (
    <div style={{ width: "100%", height: "100%", background: "#1C1917", color: "#fff", fontFamily: TB.fontBody, position: "relative", overflow: "hidden" }}>
      <PhotoSlideshow />
      {/* Clock */}
      <div style={{ position: "absolute", top: 80, left: 0, right: 0, textAlign: "center", zIndex: 1 }}>
        <div style={{ fontFamily: TB.fontDisplay, fontSize: 120, fontWeight: 500, letterSpacing: "-0.04em", lineHeight: 1, textShadow: "0 2px 20px rgba(0,0,0,0.3)" }}>{timeStr}</div>
        <div style={{ marginTop: 8, fontSize: 20, fontWeight: 500, opacity: 0.95 }}>{dateStr}</div>
      </div>
      {/* Bottom hint */}
      <div style={{ position: "absolute", bottom: 60, left: 0, right: 0, textAlign: "center", zIndex: 1 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 18px", background: "rgba(0,0,0,0.3)", backdropFilter: "blur(20px)", borderRadius: 9999, fontSize: 14, fontWeight: 500 }}>
          <Icon name="lock" size={14} color="#fff" /> {t("tapToUnlock")}
        </div>
      </div>
    </div>
  );
}

// ═══════ Kiosk Lock — Member picker state ═══════
export function KioskLockMembers() {
  const t = useTranslations("lock");
  return (
    <div style={{ width: "100%", height: "100%", background: "#1C1917", color: "#fff", fontFamily: TB.fontBody, display: "flex", flexDirection: "column", padding: 32, boxSizing: "border-box" }}>
      <div style={{ textAlign: "center", marginBottom: 50 }}>
        <div style={{ fontFamily: TB.fontDisplay, fontSize: 48, fontWeight: 500 }}>{t("whosUsing")}</div>
        <div style={{ fontSize: 16, color: TB.muted, marginTop: 8 }}>{t("tapAvatar")}</div>
      </div>
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gridTemplateRows: "repeat(2, 1fr)", gap: 32, alignItems: "center", justifyItems: "center" }}>
        {TBD.members.map((m) => (
          <div key={m.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, cursor: "pointer" }}>
            <div style={{
              width: 120, height: 120, borderRadius: "50%", background: m.color,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: TB.fontBody, fontWeight: 600, color: "#fff", fontSize: 48,
              boxShadow: `0 0 0 4px rgba(255,255,255,0.1), 0 20px 50px ${m.color}55`,
            }}>{m.initial}</div>
            <div style={{ fontSize: 20, fontWeight: 600 }}>{m.name}</div>
            <div style={{ fontSize: 12, color: TB.muted }}>{m.role === "child" ? t("pinRequired") : t("enterPassword")}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

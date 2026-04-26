"use client";

import type { CSSProperties, ReactNode } from "react";
import { useState } from "react";
import { TB } from "@/lib/tokens";
import { TBD, fmtTime, getMember, getMembers, type TBDEvent } from "@/lib/data";
// TBD import kept for CalWeek (TBD.week) and CalAgenda static group fixtures
import { Icon, type IconName } from "@/components/ui/icon";
import { Avatar, StackedAvatars } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Btn } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { H } from "@/components/ui/heading";
import { useEvents, useMembers, useCreateEvent, useUpdateEvent, useDeleteEvent } from "@/lib/api/hooks";
import { useTranslations } from "next-intl";

type View = "Day" | "Week" | "Month" | "Agenda";

const ViewTabs = ({ value, onChange }: { value: View; onChange: (v: View) => void }) => {
  const t = useTranslations("calendar");
  const views: { key: View; label: string }[] = [
    { key: "Day", label: t("views.day") },
    { key: "Week", label: t("views.week") },
    { key: "Month", label: t("views.month") },
    { key: "Agenda", label: t("views.agenda") },
  ];
  return (
    <div
      style={{
        display: "inline-flex",
        padding: 3,
        background: TB.bg2,
        borderRadius: 8,
        gap: 2,
      }}
    >
      {views.map(({ key, label }) => (
        <div
          key={key}
          onClick={() => onChange(key)}
          style={{
            padding: "6px 12px",
            borderRadius: 6,
            fontSize: 12,
            fontWeight: value === key ? 600 : 500,
            background: value === key ? TB.surface : "transparent",
            color: value === key ? TB.text : TB.text2,
            cursor: "pointer",
            boxShadow: value === key ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
          }}
        >
          {label}
        </div>
      ))}
    </div>
  );
};

export function CalDay({ dark = false, onViewChange }: { dark?: boolean; onViewChange?: (v: View) => void }) {
  const t = useTranslations("calendar");
  const bg = dark ? TB.dBg : TB.bg;
  const surf = dark ? TB.dElevated : TB.surface;
  const tc = dark ? TB.dText : TB.text;
  const tc2 = dark ? TB.dText2 : TB.text2;
  const border = dark ? TB.dBorder : TB.border;
  const bsoft = dark ? TB.dBorderSoft : TB.borderSoft;

  const [date, setDate] = useState<Date>(() => new Date());
  const today = new Date();
  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  const headerLabel = date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const subLabel = isSameDay(date, today) ? t("today") : date.toLocaleDateString();
  const shiftDay = (delta: number) => {
    const next = new Date(date);
    next.setDate(next.getDate() + delta);
    setDate(next);
  };

  const dateRange = (() => {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    return { start: start.toISOString(), end: end.toISOString() };
  })();

  const { data: apiMembers } = useMembers();
  const { data: apiEvents } = useEvents(dateRange);
  const members = apiMembers ?? [];
  const events = apiEvents ?? [];

  const hours = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
  const startH = 7;
  const endH = 21;
  const toY = (h: number) => ((h - startH) / (endH - startH)) * 100;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: bg,
        color: tc,
        fontFamily: TB.fontBody,
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          padding: "16px 20px",
          borderBottom: `1px solid ${border}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: surf,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            type="button"
            aria-label={t("previousDay")}
            data-testid="calendar-day-prev"
            onClick={() => shiftDay(-1)}
            style={{
              background: "transparent",
              border: "none",
              padding: 6,
              cursor: "pointer",
              color: tc2,
            }}
          >
            <Icon name="chevronL" size={20} />
          </button>
          <div>
            <div data-testid="calendar-day-heading">
              <H as="h2" style={{ fontSize: 20, color: tc }}>
                {headerLabel}
              </H>
            </div>
            <div style={{ fontSize: 12, color: tc2, marginTop: 2 }}>
              {subLabel} · {t("eventsCount", { count: events.length })}
            </div>
          </div>
          <button
            type="button"
            aria-label={t("nextDay")}
            data-testid="calendar-day-next"
            onClick={() => shiftDay(1)}
            style={{
              background: "transparent",
              border: "none",
              padding: 6,
              cursor: "pointer",
              color: tc2,
            }}
          >
            <Icon name="chevronR" size={20} />
          </button>
        </div>
        <ViewTabs value="Day" onChange={(v) => onViewChange?.(v)} />
      </div>
      <div style={{ flex: 1, display: "flex", minHeight: 0, overflow: "hidden" }}>
        <div
          style={{
            width: 52,
            borderRight: `1px solid ${bsoft}`,
            position: "relative",
          }}
        >
          {hours.map((h) => (
            <div
              key={h}
              style={{
                position: "absolute",
                top: `${toY(h)}%`,
                right: 8,
                transform: "translateY(-50%)",
                fontSize: 10,
                fontFamily: TB.fontMono,
                color: dark ? TB.dMuted : TB.muted,
              }}
            >
              {((h + 11) % 12) + 1}
              {h < 12 ? " AM" : " PM"}
            </div>
          ))}
        </div>
        {members.map((m) => {
          const evs = events.filter((e) => e.members.includes(m.id));
          return (
            <div
              key={m.id}
              style={{
                flex: 1,
                borderRight: `1px solid ${bsoft}`,
                display: "flex",
                flexDirection: "column",
                minWidth: 0,
              }}
            >
              <div
                style={{
                  padding: "10px",
                  background: m.color,
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <Avatar
                  member={m}
                  size={24}
                  ring={false}
                  style={{ border: "1.5px solid #fff" }}
                />
                <div style={{ fontWeight: 600, fontSize: 13 }}>{m.name}</div>
              </div>
              <div style={{ flex: 1, position: "relative", background: surf }}>
                {hours.map((h) => (
                  <div
                    key={h}
                    style={{
                      position: "absolute",
                      left: 0,
                      right: 0,
                      top: `${toY(h)}%`,
                      height: 1,
                      background: bsoft,
                    }}
                  />
                ))}
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    top: `${toY(10 + 34 / 60)}%`,
                    height: 2,
                    background: TB.destructive,
                    zIndex: 2,
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      left: -4,
                      top: -3,
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: TB.destructive,
                    }}
                  />
                </div>
                {evs.map((e) => {
                  const [sh, sm] = e.start.split(":").map(Number);
                  const [eh, em] = e.end.split(":").map(Number);
                  const top = toY(sh + sm / 60);
                  const height = toY(eh + em / 60) - top;
                  return (
                    <div
                      key={e.id}
                      style={{
                        position: "absolute",
                        top: `${top}%`,
                        height: `${height}%`,
                        left: 3,
                        right: 3,
                        borderRadius: 5,
                        background: m.color + (dark ? "33" : "22"),
                        borderLeft: `3px solid ${m.color}`,
                        padding: "3px 5px",
                        overflow: "hidden",
                        cursor: "pointer",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          color: tc,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {e.title}
                      </div>
                      <div style={{ fontSize: 9, color: tc2, fontFamily: TB.fontMono }}>
                        {fmtTime(e.start)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function CalWeek({ onViewChange }: { onViewChange?: (v: View) => void } = {}) {
  const t = useTranslations("calendar");
  const [weekStart, setWeekStart] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - d.getDay()); // back up to Sunday
    return d;
  });
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  const sameMonth = weekStart.getMonth() === weekEnd.getMonth();
  const headerLabel = sameMonth
    ? `${weekStart.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${weekEnd.getDate()}, ${weekEnd.getFullYear()}`
    : `${weekStart.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${weekEnd.toLocaleDateString(undefined, { month: "short", day: "numeric" })}, ${weekEnd.getFullYear()}`;
  const shiftWeek = (delta: number) => {
    const next = new Date(weekStart);
    next.setDate(next.getDate() + delta * 7);
    setWeekStart(next);
  };
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: TB.bg,
        color: TB.text,
        fontFamily: TB.fontBody,
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          padding: "14px 20px",
          borderBottom: `1px solid ${TB.border}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: TB.surface,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            type="button"
            aria-label={t("previousDay")}
            data-testid="calendar-week-prev"
            onClick={() => shiftWeek(-1)}
            style={{ background: "transparent", border: "none", padding: 6, cursor: "pointer", color: TB.text2 }}
          >
            <Icon name="chevronL" size={20} />
          </button>
          <div data-testid="calendar-week-heading">
            <H as="h2" style={{ fontSize: 20 }}>
              {headerLabel}
            </H>
          </div>
          <button
            type="button"
            aria-label={t("nextDay")}
            data-testid="calendar-week-next"
            onClick={() => shiftWeek(1)}
            style={{ background: "transparent", border: "none", padding: 6, cursor: "pointer", color: TB.text2 }}
          >
            <Icon name="chevronR" size={20} />
          </button>
        </div>
        <ViewTabs value="Week" onChange={(v) => onViewChange?.(v)} />
      </div>
      <div
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "repeat(7,1fr)",
          borderRight: `1px solid ${TB.borderSoft}`,
          overflow: "hidden",
        }}
      >
        {TBD.week.map((d) => {
          const isToday = d.day === "Thu";
          const dayKeyMap: Record<string, "sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat"> = {
            Sun: "sun", Mon: "mon", Tue: "tue", Wed: "wed", Thu: "thu", Fri: "fri", Sat: "sat",
          };
          const dayKey = dayKeyMap[d.day] ?? "mon";
          return (
            <div
              key={d.day}
              style={{
                borderLeft: `1px solid ${TB.borderSoft}`,
                display: "flex",
                flexDirection: "column",
                background: isToday ? TB.primary + "08" : TB.surface,
              }}
            >
              <div
                style={{
                  padding: "10px 10px",
                  borderBottom: `1px solid ${TB.borderSoft}`,
                  display: "flex",
                  alignItems: "baseline",
                  gap: 6,
                  background: isToday ? TB.primary + "15" : TB.bg2,
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: isToday ? TB.primary : TB.text2,
                    letterSpacing: "0.08em",
                  }}
                >
                  {t(`weekDays.${dayKey}`)}
                </div>
                <div
                  style={{
                    fontFamily: TB.fontDisplay,
                    fontSize: 20,
                    fontWeight: 500,
                    color: isToday ? TB.primary : TB.text,
                    marginLeft: "auto",
                  }}
                >
                  {d.date}
                </div>
              </div>
              <div
                style={{
                  flex: 1,
                  padding: 6,
                  display: "flex",
                  flexDirection: "column",
                  gap: 3,
                  overflow: "hidden",
                }}
              >
                {d.items.map((it, j) => {
                  const m = it.m === "all" ? null : getMember(it.m);
                  const c = m ? m.color : TB.primary;
                  const mins = (it.h % 1) * 60;
                  return (
                    <div
                      key={j}
                      style={{
                        padding: "4px 6px",
                        background: c + "1A",
                        borderLeft: `2.5px solid ${c}`,
                        borderRadius: 4,
                        fontSize: 10,
                      }}
                    >
                      <div
                        style={{
                          fontFamily: TB.fontMono,
                          color: TB.text2,
                          fontSize: 9,
                        }}
                      >
                        {Math.floor(it.h)}:{mins ? "30" : "00"} {it.h < 12 ? "a" : "p"}
                      </div>
                      <div style={{ fontWeight: 600, marginTop: 1, color: TB.text }}>
                        {it.t}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function CalMonth({ onViewChange }: { onViewChange?: (v: View) => void } = {}) {
  const t = useTranslations("calendar");
  const [anchor, setAnchor] = useState<Date>(() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const today = new Date();
  const month = anchor.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const firstWeekday = anchor.getDay();
  const daysInMonth = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0).getDate();
  const days: { d: number; cur: boolean; date: Date }[] = [];
  for (let i = 0; i < 35; i++) {
    const dayNum = i - firstWeekday + 1;
    const cur = dayNum >= 1 && dayNum <= daysInMonth;
    const date = new Date(anchor);
    date.setDate(dayNum);
    days.push({ d: dayNum, cur, date });
  }
  const shiftMonth = (delta: number) => {
    const next = new Date(anchor);
    next.setMonth(next.getMonth() + delta);
    setAnchor(next);
  };
  const isTodayMonth =
    today.getFullYear() === anchor.getFullYear() && today.getMonth() === anchor.getMonth();
  const evMap: Record<number, { c: string }[]> = {
    19: [{ c: "#3B82F6" }, { c: "#F59E0B" }],
    20: [{ c: "#EF4444" }, { c: "#22C55E" }],
    21: [{ c: "#3B82F6" }, { c: "#F59E0B" }],
    22: [{ c: "#3B82F6" }, { c: "#EF4444" }, { c: "#22C55E" }, { c: "#F59E0B" }],
    23: [{ c: "#EF4444" }],
    24: [{ c: "#22C55E" }, { c: "#F59E0B" }],
    25: [{ c: "#3B82F6" }, { c: "#EF4444" }, { c: "#22C55E" }, { c: "#F59E0B" }],
    10: [{ c: "#EF4444" }],
    11: [{ c: "#22C55E" }],
    14: [{ c: "#3B82F6" }],
    15: [{ c: "#EF4444" }, { c: "#F59E0B" }],
    16: [{ c: "#22C55E" }],
    17: [{ c: "#3B82F6" }],
    28: [{ c: "#EF4444" }, { c: "#F59E0B" }],
    30: [{ c: "#3B82F6" }],
  };

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: TB.bg,
        color: TB.text,
        fontFamily: TB.fontBody,
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          padding: "14px 20px",
          borderBottom: `1px solid ${TB.border}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: TB.surface,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            type="button"
            aria-label={t("previousDay")}
            data-testid="calendar-month-prev"
            onClick={() => shiftMonth(-1)}
            style={{ background: "transparent", border: "none", padding: 6, cursor: "pointer", color: TB.text2 }}
          >
            <Icon name="chevronL" size={20} />
          </button>
          <div data-testid="calendar-month-heading">
            <H as="h2" style={{ fontSize: 20 }}>
              {month}
            </H>
          </div>
          <button
            type="button"
            aria-label={t("nextDay")}
            data-testid="calendar-month-next"
            onClick={() => shiftMonth(1)}
            style={{ background: "transparent", border: "none", padding: 6, cursor: "pointer", color: TB.text2 }}
          >
            <Icon name="chevronR" size={20} />
          </button>
        </div>
        <ViewTabs value="Month" onChange={(v) => onViewChange?.(v)} />
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7,1fr)",
          background: TB.bg2,
          borderBottom: `1px solid ${TB.border}`,
        }}
      >
        {(["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const).map((d) => (
          <div
            key={d}
            style={{
              padding: "8px 10px",
              fontSize: 10,
              fontWeight: 600,
              color: TB.text2,
              letterSpacing: "0.08em",
            }}
          >
            {t(`weekDays.${d}`)}
          </div>
        ))}
      </div>
      <div
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "repeat(7,1fr)",
          gridTemplateRows: "repeat(5,1fr)",
        }}
      >
        {days.map((day, i) => {
          const isToday =
            day.cur &&
            isTodayMonth &&
            day.d === today.getDate();
          const evs = day.cur ? evMap[day.d] ?? [] : [];
          // Spillover days at the start/end of the visible 5-week grid show
          // the right-edge day-of-month from the adjacent month.
          let dispNum: number;
          if (day.cur) {
            dispNum = day.d;
          } else if (day.d <= 0) {
            const prev = new Date(anchor.getFullYear(), anchor.getMonth(), 0);
            dispNum = prev.getDate() + day.d;
          } else {
            dispNum = day.d - daysInMonth;
          }
          return (
            <div
              key={i}
              style={{
                borderRight: `1px solid ${TB.borderSoft}`,
                borderBottom: `1px solid ${TB.borderSoft}`,
                padding: 8,
                background: isToday ? TB.primary + "08" : TB.surface,
                opacity: day.cur ? 1 : 0.35,
              }}
            >
              <div
                style={{
                  fontFamily: TB.fontDisplay,
                  fontSize: 16,
                  fontWeight: isToday ? 600 : 500,
                  width: 26,
                  height: 26,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: isToday ? TB.primary : "transparent",
                  color: isToday ? "#fff" : TB.text,
                  borderRadius: "50%",
                }}
              >
                {dispNum}
              </div>
              <div style={{ display: "flex", gap: 3, marginTop: 6, flexWrap: "wrap" }}>
                {evs.slice(0, 4).map((e, j) => (
                  <div
                    key={j}
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: e.c,
                    }}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function CalAgenda({ onViewChange }: { onViewChange?: (v: View) => void } = {}) {
  const t = useTranslations("calendar");
  const today = new Date();
  const start = today.toISOString().slice(0, 10);
  const endDate = new Date(today);
  endDate.setDate(endDate.getDate() + 7);
  const end = endDate.toISOString().slice(0, 10);

  const [query, setQuery] = useState("");
  const { data: apiEvents } = useEvents({ start, end });

  const todayEvents: TBDEvent[] = apiEvents ?? [];

  const allGroups: { label: string; items: TBDEvent[] }[] = [
    { label: `${t("today").toUpperCase()} · THURSDAY, APR 22`, items: todayEvents },
    {
      label: "TOMORROW · FRIDAY, APR 23",
      items: [
        {
          id: "f1",
          title: "Book club",
          start: "20:00",
          end: "21:30",
          members: ["mom"],
          location: "The Reading Room",
        },
        {
          id: "f2",
          title: "Team offsite prep",
          start: "10:00",
          end: "11:00",
          members: ["dad"],
          location: "Zoom",
        },
      ],
    },
    {
      label: "SATURDAY, APR 24",
      items: [
        {
          id: "s1",
          title: "Park visit",
          start: "10:00",
          end: "12:00",
          members: ["dad", "mom", "jackson", "emma"],
          location: "Golden Gate Park",
        },
        {
          id: "s2",
          title: "Playdate — Maya",
          start: "14:00",
          end: "16:00",
          members: ["emma"],
          location: "Maya's house",
        },
      ],
    },
  ];

  const q = query.trim().toLowerCase();
  const groups = q
    ? allGroups
        .map((g) => ({
          label: g.label,
          items: g.items.filter(
            (e) =>
              e.title.toLowerCase().includes(q) ||
              (e.location ?? "").toLowerCase().includes(q)
          ),
        }))
        .filter((g) => g.items.length > 0)
    : allGroups;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: TB.bg,
        color: TB.text,
        fontFamily: TB.fontBody,
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          padding: "14px 20px",
          borderBottom: `1px solid ${TB.border}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: TB.surface,
        }}
      >
        <H as="h2" style={{ fontSize: 20 }}>
          {t("agenda")}
        </H>
        <ViewTabs value="Agenda" onChange={(v) => onViewChange?.(v)} />
      </div>
      <div
        style={{
          padding: "12px 20px",
          background: TB.surface,
          borderBottom: `1px solid ${TB.borderSoft}`,
        }}
      >
        <Input
          value={query}
          onChange={setQuery}
          placeholder={t("searchPlaceholder")}
          icon="search"
        />
      </div>
      <div style={{ flex: 1, overflow: "auto", padding: "16px 20px" }}>
        {groups.map((group) => (
          <div key={group.label} style={{ marginBottom: 22 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.08em",
                color: TB.text2,
                marginBottom: 10,
              }}
            >
              {group.label}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {group.items.length === 0 && (
                <div style={{ fontSize: 13, color: TB.text2, padding: "8px 0" }}>
                  {t("noEventsYet")}
                </div>
              )}
              {group.items.map((e) => {
                const ms = getMembers(e.members);
                return (
                  <Card
                    key={e.id}
                    pad={12}
                    style={{ display: "flex", alignItems: "center", gap: 14 }}
                  >
                    <StackedAvatars members={ms} size={32} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 550 }}>{e.title}</div>
                      <div
                        style={{
                          fontSize: 12,
                          color: TB.text2,
                          marginTop: 2,
                          fontFamily: TB.fontMono,
                        }}
                      >
                        {fmtTime(e.start)} – {fmtTime(e.end)} · {e.location}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const Row = ({
  icon,
  label,
  children,
}: {
  icon: IconName;
  label: string;
  children: ReactNode;
}) => (
  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 4px" }}>
    <Icon name={icon} size={16} color={TB.text2} />
    <div style={{ fontSize: 12, color: TB.text2, width: 70 }}>{label}</div>
    <div style={{ flex: 1 }}>{children}</div>
  </div>
);

// Formats a Date to "YYYY-MM-DDThh:mm" for datetime-local inputs
function toDatetimeLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export type EventFormData = {
  id?: string;
  title?: string;
  start?: string;
  end?: string;
  start_time?: string;
  end_time?: string;
  location?: string;
  description?: string;
  members?: string[];
  recurrence_rule?: string;
};

export type EventModalProps = {
  event?: EventFormData;
  onClose: () => void;
};

export function EventModal({ event, onClose }: EventModalProps) {
  const t = useTranslations("calendar");
  const tCommon = useTranslations("common");
  const { data: apiMembers } = useMembers();
  const { data: allEvents } = useEvents();
  const members = apiMembers ?? [];

  const now = new Date();
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

  // Resolve the initial start/end from either ISO start_time or legacy "HH:mm" start
  const resolveStart = (): string => {
    if (event?.start_time) return toDatetimeLocal(new Date(event.start_time));
    if (event?.start && event.start.includes("T")) return toDatetimeLocal(new Date(event.start));
    return toDatetimeLocal(now);
  };
  const resolveEnd = (): string => {
    if (event?.end_time) return toDatetimeLocal(new Date(event.end_time));
    if (event?.end && event.end.includes("T")) return toDatetimeLocal(new Date(event.end));
    return toDatetimeLocal(oneHourLater);
  };

  const [title, setTitle] = useState(event?.title ?? "");
  const [startTime, setStartTime] = useState(resolveStart);
  const [endTime, setEndTime] = useState(resolveEnd);
  const [location, setLocation] = useState(event?.location ?? "");
  const [description, setDescription] = useState(event?.description ?? "");
  const [recurrence, setRecurrence] = useState<string>(event?.recurrence_rule ?? "");
  const [error, setError] = useState("");

  const createEvent = useCreateEvent();
  const updateEvent = useUpdateEvent();
  const deleteEvent = useDeleteEvent();

  const isEdit = Boolean(event?.id);
  const busy = createEvent.isPending || updateEvent.isPending || deleteEvent.isPending;

  // Real conflict detection: any other event whose [start, end) overlaps the
  // event being edited. The current event itself is excluded by id. Returns
  // up to 3 conflicts so the warning stays compact.
  const conflicts = (() => {
    if (!startTime || !endTime || !allEvents) return [];
    const draftStart = new Date(startTime).getTime();
    const draftEnd = new Date(endTime).getTime();
    if (!Number.isFinite(draftStart) || !Number.isFinite(draftEnd) || draftEnd <= draftStart) {
      return [];
    }
    return allEvents
      .filter((e) => {
        if (event?.id && e.id === event.id) return false;
        const startStr = e.start_time ?? (e.start && e.start.includes("T") ? e.start : null);
        const endStr = e.end_time ?? (e.end && e.end.includes("T") ? e.end : null);
        if (!startStr || !endStr) return false;
        const s = new Date(startStr).getTime();
        const en = new Date(endStr).getTime();
        if (!Number.isFinite(s) || !Number.isFinite(en)) return false;
        return s < draftEnd && en > draftStart;
      })
      .slice(0, 3);
  })();

  const handleSave = () => {
    if (!title.trim()) {
      setError(t("titleRequired") || "Title is required");
      return;
    }
    setError("");
    const start_time = new Date(startTime).toISOString();
    const end_time = new Date(endTime).toISOString();

    if (isEdit && event?.id) {
      updateEvent.mutate(
        {
          id: event.id,
          title: title.trim(),
          start_time,
          end_time,
          location,
          description,
          recurrence_rule: recurrence,
        },
        { onSuccess: onClose }
      );
    } else {
      createEvent.mutate(
        {
          title: title.trim(),
          start_time,
          end_time,
          location,
          description,
          ...(recurrence ? { recurrence_rule: recurrence } : {}),
        },
        { onSuccess: onClose }
      );
    }
  };

  const handleDelete = () => {
    if (!event?.id) return;
    deleteEvent.mutate(event.id, { onSuccess: onClose });
  };

  const inputStyle: CSSProperties = {
    width: "100%",
    padding: "6px 0",
    border: "none",
    borderBottom: `1px solid ${TB.border}`,
    fontFamily: TB.fontBody,
    fontSize: 13,
    color: TB.text,
    background: "transparent",
    outline: "none",
    boxSizing: "border-box",
  };

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "rgba(28,25,23,0.45)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        fontFamily: TB.fontBody,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 520,
          background: TB.surface,
          borderRadius: "16px 16px 0 0",
          boxShadow: "0 -20px 60px rgba(0,0,0,0.2)",
          maxHeight: "92%",
          overflow: "auto",
        }}
      >
        {/* drag handle */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: `1px solid ${TB.borderSoft}`,
          }}
        >
          <div
            style={{
              width: 36,
              height: 4,
              borderRadius: 4,
              background: TB.border,
              margin: "0 auto",
            }}
          />
        </div>

        <div style={{ padding: 20 }}>
          {/* Conflict warning — real time-overlap detection */}
          {conflicts.length > 0 && (
            <div
              data-testid="event-conflict-warning"
              role="alert"
              style={{
                marginBottom: 12,
                padding: "10px 12px",
                background: TB.warning + "18",
                border: `1px solid ${TB.warning}`,
                borderRadius: 8,
                fontSize: 12,
                color: TB.text,
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: 4, color: TB.warning }}>
                {conflicts.length === 1
                  ? `Conflicts with "${conflicts[0].title}"`
                  : `Conflicts with ${conflicts.length} other events`}
              </div>
              <div style={{ color: TB.text2 }}>
                {conflicts.map((c) => c.title).join(" · ")}
              </div>
            </div>
          )}
          {/* Title */}
          <Input
            value={title}
            onChange={(v) => setTitle(v)}
            placeholder="Event title"
            style={{
              height: 54,
              fontSize: 20,
              fontWeight: 600,
              border: "none",
              padding: "0",
              fontFamily: TB.fontDisplay,
            }}
          />
          {error && (
            <div style={{ fontSize: 12, color: TB.destructive, marginTop: 4 }}>{error}</div>
          )}

          {/* Time fields */}
          <div
            style={{
              marginTop: 16,
              padding: "14px 0",
              borderTop: `1px solid ${TB.borderSoft}`,
              borderBottom: `1px solid ${TB.borderSoft}`,
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <Row icon="clock" label={t("start")}>
              <input
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                style={inputStyle}
              />
            </Row>
            <Row icon="clock" label={t("end")}>
              <input
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                style={inputStyle}
              />
            </Row>
          </div>

          {/* Repeat — sets recurrence_rule. Yearly is intended for birthdays
              and anniversaries; backend already accepts the field. */}
          <div style={{ marginTop: 14 }}>
            <Row icon="clock" label={t("repeat")}>
              <select
                data-testid="event-recurrence"
                value={recurrence}
                onChange={(e) => setRecurrence(e.target.value)}
                style={{ ...inputStyle, padding: "6px 0", appearance: "auto" }}
              >
                <option value="">{t("doesNotRepeat")}</option>
                <option value="FREQ=DAILY">Daily</option>
                <option value="FREQ=WEEKLY">Weekly</option>
                <option value="FREQ=MONTHLY">Monthly</option>
                <option value="FREQ=YEARLY">Yearly (birthday / anniversary)</option>
              </select>
            </Row>
          </div>

          {/* Location */}
          <div style={{ marginTop: 14 }}>
            <Row icon="mapPin" label={t("location")}>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Add location"
                style={inputStyle}
              />
            </Row>
          </div>

          {/* Members (display only — no assignment API on create yet) */}
          {members.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: TB.text2,
                  marginBottom: 8,
                  letterSpacing: "0.04em",
                }}
              >
                {t("assignedTo")}
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                {members.map((m) => (
                  <div key={m.id} style={{ textAlign: "center", opacity: 0.5 }}>
                    <Avatar member={m} size={44} selected={false} />
                    <div style={{ fontSize: 10, marginTop: 4, color: TB.text2 }}>
                      {m.name}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes / description */}
          <div style={{ marginTop: 14 }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: TB.text2,
                marginBottom: 6,
              }}
            >
              {t("notes")}
            </div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add notes…"
              rows={3}
              style={{
                width: "100%",
                padding: "10px 12px",
                border: `1px solid ${TB.border}`,
                borderRadius: 6,
                fontSize: 13,
                color: TB.text,
                background: TB.bg,
                fontFamily: TB.fontBody,
                resize: "vertical",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: 14,
            borderTop: `1px solid ${TB.borderSoft}`,
            display: "flex",
            gap: 10,
            alignItems: "center",
          }}
        >
          {isEdit && (
            <Btn
              kind="ghost"
              size="md"
              icon="trash"
              style={{ color: TB.destructive }}
              onClick={handleDelete}
              disabled={busy}
            >
              {tCommon("delete")}
            </Btn>
          )}
          <div style={{ flex: 1 }} />
          <Btn kind="secondary" size="md" onClick={onClose} disabled={busy}>
            {tCommon("cancel")}
          </Btn>
          <Btn kind="primary" size="md" onClick={handleSave} disabled={busy}>
            {busy ? "…" : tCommon("save")}
          </Btn>
        </div>
      </div>
    </div>
  );
}

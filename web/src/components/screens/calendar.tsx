"use client";

import type { CSSProperties, ReactNode } from "react";
import { TB } from "@/lib/tokens";
import { TBD, fmtTime, getMember, getMembers, type TBDEvent } from "@/lib/data";
import { Icon, type IconName } from "@/components/ui/icon";
import { Avatar, StackedAvatars } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Btn } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { H } from "@/components/ui/heading";
import { useEvents, useMembers } from "@/lib/api/hooks";
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

export function CalDay({ dark = false }: { dark?: boolean }) {
  const t = useTranslations("calendar");
  const bg = dark ? TB.dBg : TB.bg;
  const surf = dark ? TB.dElevated : TB.surface;
  const tc = dark ? TB.dText : TB.text;
  const tc2 = dark ? TB.dText2 : TB.text2;
  const border = dark ? TB.dBorder : TB.border;
  const bsoft = dark ? TB.dBorderSoft : TB.borderSoft;

  const { data: apiMembers } = useMembers();
  const { data: apiEvents } = useEvents();
  const members = apiMembers && apiMembers.length > 0 ? apiMembers : TBD.members;
  const events = apiEvents && apiEvents.length > 0 ? apiEvents : TBD.events;

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
            <H as="h2" style={{ fontSize: 20, color: tc }}>
              Thursday, April 22
            </H>
            <div style={{ fontSize: 12, color: tc2, marginTop: 2 }}>{t("today")} · {t("eventsCount", { count: 7 })}</div>
          </div>
          <button
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
        <ViewTabs value="Day" onChange={() => {}} />
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

export function CalWeek() {
  const t = useTranslations("calendar");
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
          Apr 19 – 25, 2026
        </H>
        <ViewTabs value="Week" onChange={() => {}} />
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

export function CalMonth() {
  const t = useTranslations("calendar");
  const month = "April 2026";
  const offset = 3;
  const days: { d: number; cur: boolean }[] = [];
  for (let i = 0; i < 35; i++) {
    const d = i - offset + 1;
    days.push({ d, cur: d >= 1 && d <= 30 });
  }
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
        <H as="h2" style={{ fontSize: 20 }}>
          {month}
        </H>
        <ViewTabs value="Month" onChange={() => {}} />
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
          const isToday = day.cur && day.d === 22;
          const evs = day.cur ? evMap[day.d] ?? [] : [];
          const dispNum =
            day.d > 0 && day.d <= 31
              ? day.d > 30 && !day.cur
                ? day.d - 30
                : day.d
              : 31 + day.d;
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

export function CalAgenda() {
  const t = useTranslations("calendar");
  const today = new Date();
  const start = today.toISOString().slice(0, 10);
  const endDate = new Date(today);
  endDate.setDate(endDate.getDate() + 7);
  const end = endDate.toISOString().slice(0, 10);

  const { data: apiEvents } = useEvents({ start, end });

  // Fallback to TBD sample events when API data is unavailable
  const todayEvents: TBDEvent[] = (apiEvents && apiEvents.length > 0)
    ? apiEvents
    : TBD.events.slice(0, 5);

  const groups: { label: string; items: TBDEvent[] }[] = [
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
        <ViewTabs value="Agenda" onChange={() => {}} />
      </div>
      <div
        style={{
          padding: "12px 20px",
          background: TB.surface,
          borderBottom: `1px solid ${TB.borderSoft}`,
        }}
      >
        <Input
          value=""
          onChange={() => {}}
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

export function EventModal() {
  const t = useTranslations("calendar");
  const tCommon = useTranslations("common");
  const { data: apiMembers } = useMembers();
  const members = apiMembers && apiMembers.length > 0 ? apiMembers : TBD.members;
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
        <div
          style={{
            padding: "16px 20px",
            borderBottom: `1px solid ${TB.borderSoft}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
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
          <Input
            value="Dentist — Jackson"
            onChange={() => {}}
            style={{
              height: 54,
              fontSize: 20,
              fontWeight: 600,
              border: "none",
              padding: "0",
              fontFamily: TB.fontDisplay,
            }}
          />

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
              <span style={{ fontFamily: TB.fontMono, fontSize: 13 }}>
                Thu, Apr 22 · 9:00 AM
              </span>
            </Row>
            <Row icon="clock" label={t("end")}>
              <span style={{ fontFamily: TB.fontMono, fontSize: 13 }}>
                Thu, Apr 22 · 10:00 AM
              </span>
            </Row>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "4px 12px",
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 20,
                  borderRadius: 9999,
                  background: TB.border,
                  padding: 2,
                  position: "relative",
                }}
              >
                <div
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    background: "#fff",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
                  }}
                />
              </div>
              <div style={{ fontSize: 13 }}>{t("allDay")}</div>
            </div>
          </div>

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
              {members.map((m) => {
                const sel = ["mom", "jackson"].includes(m.id);
                return (
                  <div
                    key={m.id}
                    style={{ textAlign: "center", opacity: sel ? 1 : 0.35 }}
                  >
                    <Avatar member={m} size={44} selected={sel} />
                    <div style={{ fontSize: 10, marginTop: 4, color: TB.text2 }}>
                      {m.name}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div
            style={{
              marginTop: 16,
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <Row icon="mapPin" label={t("location")}>
              <span style={{ fontSize: 13 }}>Dr. Patel, Market St</span>
            </Row>
            <Row icon="calendar" label={t("calendarLabel")}>
              <span style={{ fontSize: 13 }}>Family · Google</span>
            </Row>
            <Row icon="bell" label={t("reminder")}>
              <span style={{ fontSize: 13 }}>{t("reminderBefore")}</span>
            </Row>
            <Row icon="arrowR" label={t("repeat")}>
              <span style={{ fontSize: 13, color: TB.text2 }}>{t("doesNotRepeat")}</span>
            </Row>
          </div>

          <div
            style={{
              marginTop: 14,
              padding: "10px 12px",
              background: TB.warning + "18",
              border: `1px solid ${TB.warning}40`,
              borderRadius: 8,
              display: "flex",
              gap: 10,
              alignItems: "flex-start",
            }}
          >
            <Icon name="bell" size={16} color={TB.warning} />
            <div style={{ fontSize: 12, color: "#92400E" }}>
              <div style={{ fontWeight: 600 }}>
                {t("conflict")}
              </div>
              <div style={{ marginTop: 2 }}>{t("conflictHint")}</div>
            </div>
          </div>

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
            <div
              style={{
                padding: "10px 12px",
                border: `1px solid ${TB.border}`,
                borderRadius: 6,
                fontSize: 13,
                color: TB.text2,
                minHeight: 60,
              }}
            >
              Bring Jackson&apos;s insurance card. Parking validated — bring ticket.
            </div>
          </div>
        </div>
        <div
          style={{
            padding: 14,
            borderTop: `1px solid ${TB.borderSoft}`,
            display: "flex",
            gap: 10,
            alignItems: "center",
          }}
        >
          <Btn kind="ghost" size="md" icon="trash" style={{ color: TB.destructive }}>
            {tCommon("delete")}
          </Btn>
          <div style={{ flex: 1 }} />
          <Btn kind="secondary" size="md">
            {tCommon("cancel")}
          </Btn>
          <Btn kind="primary" size="md">
            {tCommon("save")}
          </Btn>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TB } from "@/lib/tokens";
import { fmtTime, getMembers } from "@/lib/data";
import { Icon, type IconName } from "@/components/ui/icon";
import { Avatar, StackedAvatars } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Btn } from "@/components/ui/button";
import { H } from "@/components/ui/heading";
import { useEvents, useMembers } from "@/lib/api/hooks";
import { useWeather } from "@/lib/weather/use-weather";
import { useAuth } from "@/lib/auth/auth-store";
import { useTranslations } from "next-intl";

export function DashDesktop() {
  const t = useTranslations("dashboard");
  const tNav = useTranslations("nav");
  const router = useRouter();
  const { data: apiMembers } = useMembers();
  const { activeMember, setActiveMember } = useAuth();
  const { data: apiEvents } = useEvents(activeMember ? { memberId: activeMember.id } : undefined);
  const { data: weather } = useWeather();
  const members = apiMembers ?? [];
  const events = apiEvents ?? [];

  /** Toggle: clicking the already-active member clears the filter. */
  function handleMemberClick(m: (typeof members)[0]) {
    if (activeMember?.id === m.id) {
      setActiveMember(null);
    } else {
      setActiveMember({ id: m.id, name: m.name, role: m.role === "child" ? "child" : "adult" });
    }
  }

  const NAV: { i: IconName; l: string; href: string; active?: boolean }[] = [
    { i: "calendar", l: tNav("calendar"), href: "/calendar", active: true },
    { i: "checkCircle", l: tNav("routines"), href: "/routines" },
    { i: "list", l: tNav("lists"), href: "/lists" },
    { i: "pencil", l: tNav("notes"), href: "/notes" },
    { i: "chef", l: tNav("meals"), href: "/meals" },
    { i: "star", l: tNav("equity"), href: "/equity" },
    { i: "settings", l: tNav("settings"), href: "/settings" },
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
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: 200,
          background: TB.surface,
          borderRight: `1px solid ${TB.border}`,
          padding: "20px 12px",
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <div
          style={{
            padding: "0 8px 16px",
            borderBottom: `1px solid ${TB.borderSoft}`,
            marginBottom: 8,
          }}
        >
          <div
            style={{
              fontFamily: TB.fontDisplay,
              fontSize: 18,
              fontWeight: 600,
              color: TB.primary,
            }}
          >
            tidyboard
          </div>
          <div style={{ fontSize: 11, color: TB.text2, marginTop: 2 }}>
            The Smith Family
          </div>
        </div>
        {members.map((m) => {
          const isActive = activeMember?.id === m.id;
          return (
            <div
              key={m.id}
              data-testid={`member-tile-${m.id}`}
              onClick={() => handleMemberClick(m)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px",
                borderRadius: 8,
                cursor: "pointer",
                background: isActive ? `${TB.primary}18` : "transparent",
                border: isActive ? `1.5px solid ${TB.primary}` : "1.5px solid transparent",
                transition: "background 0.15s, border-color 0.15s",
              }}
            >
              <Avatar member={m} size={30} ring={false} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: isActive ? 650 : 550,
                    color: isActive ? TB.primary : TB.text,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {m.name}
                </div>
                <div style={{ fontSize: 10, color: TB.text2 }}>
                  {m.role === "child"
                    ? `⭐ ${m.stars} · 🔥 ${t("streak", { n: m.streak })}`
                    : t("eventsShort", { count: events.filter((e) => e.members.includes(m.id)).length })}
                </div>
              </div>
            </div>
          );
        })}
        <div style={{ flex: 1 }} />
        <div style={{ padding: "8px 8px", display: "flex", flexDirection: "column", gap: 2 }}>
          {NAV.map((n) => (
            <Link
              key={n.l}
              href={n.href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "7px 8px",
                borderRadius: 6,
                cursor: "pointer",
                background: n.active ? `${TB.primary}18` : "transparent",
                color: n.active ? TB.primary : TB.text2,
                fontWeight: n.active ? 600 : 450,
                fontSize: 13,
                textDecoration: "none",
              }}
            >
              <Icon name={n.i} size={16} color={n.active ? TB.primary : TB.text2} />
              {n.l}
            </Link>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <div
          style={{
            padding: "18px 24px",
            borderBottom: `1px solid ${TB.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: TB.surface,
          }}
        >
          <div>
            <H as="h2" style={{ fontSize: 22 }}>
              Today, April 22
            </H>
            <div style={{ fontSize: 12, color: TB.text2, marginTop: 2 }}>
              {t("eventsCount", { count: events.length })}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn kind="secondary" size="sm" icon="search" onClick={() => router.push("/calendar?view=Agenda")}>
              {t("search")}
            </Btn>
            <Btn kind="primary" size="sm" icon="plus" onClick={() => router.push("/calendar?new=event")}>
              {t("newEvent")}
            </Btn>
          </div>
        </div>
        <div style={{ flex: 1, padding: 20, overflow: "auto" }}>
          <Card pad={0} style={{ overflow: "hidden" }}>
            {events.length === 0 && (
              <div style={{ padding: "32px 20px", textAlign: "center", color: TB.text2, fontSize: 14 }}>
                {t("noEvents")}
              </div>
            )}
            {events.map((e, i) => {
              const ms = getMembers(e.members);
              return (
                <div
                  key={e.id}
                  style={{
                    display: "flex",
                    alignItems: "stretch",
                    borderBottom:
                      i < events.length - 1 ? `1px solid ${TB.borderSoft}` : "none",
                  }}
                >
                  <div
                    style={{
                      width: 110,
                      padding: "14px 16px",
                      background: TB.bg2,
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                    }}
                  >
                    <div
                      style={{
                        fontFamily: TB.fontMono,
                        fontSize: 13,
                        fontWeight: 500,
                      }}
                    >
                      {fmtTime(e.start)}
                    </div>
                    <div
                      style={{
                        fontFamily: TB.fontMono,
                        fontSize: 11,
                        color: TB.text2,
                      }}
                    >
                      {fmtTime(e.end)}
                    </div>
                  </div>
                  <div
                    style={{
                      flex: 1,
                      padding: "14px 16px",
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                    }}
                  >
                    <div
                      style={{
                        width: 4,
                        height: 36,
                        background: ms.length > 1 ? TB.primary : ms[0].color,
                        borderRadius: 2,
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 15, fontWeight: 550 }}>{e.title}</div>
                      {e.location && (
                        <div
                          style={{
                            fontSize: 12,
                            color: TB.text2,
                            marginTop: 2,
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <Icon name="mapPin" size={11} />
                          {e.location}
                        </div>
                      )}
                    </div>
                    <StackedAvatars members={ms} size={26} />
                  </div>
                </div>
              );
            })}
          </Card>
        </div>
      </div>

      <div
        style={{
          width: 320,
          background: TB.surface,
          borderLeft: `1px solid ${TB.border}`,
          padding: 20,
          display: "flex",
          flexDirection: "column",
          gap: 14,
          overflow: "auto",
        }}
      >
        <Card pad={14} style={{ background: TB.primary, color: "#fff", border: "none" }}>
          <div
            style={{
              fontSize: 11,
              opacity: 0.85,
              letterSpacing: "0.1em",
              fontFamily: TB.fontMono,
            }}
          >
            {t("nextUp")}
          </div>
          <div
            style={{
              fontFamily: TB.fontDisplay,
              fontSize: 20,
              fontWeight: 500,
              marginTop: 4,
            }}
          >
            Grocery run
          </div>
          <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4 }}>
            11:00 AM · Trader Joe&apos;s
          </div>
        </Card>

        <div>
          <H as="h3" style={{ fontSize: 16, marginBottom: 8 }}>
            {t("weather")}
          </H>
          <Card pad={14} style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <Icon name={weather?.icon ?? "sun"} size={40} color={TB.warning} />
            <div>
              <div
                style={{
                  fontFamily: TB.fontDisplay,
                  fontSize: 28,
                  fontWeight: 500,
                }}
              >
                {weather ? `${weather.tempNow}°` : "—"}
              </div>
              <div style={{ fontSize: 12, color: TB.text2 }}>
                {weather
                  ? `${weather.label} · H ${weather.high} · L ${weather.low}`
                  : "Loading…"}
              </div>
            </div>
          </Card>
        </div>

        <CelebrationsCard events={events} />

        <div>
          <H as="h3" style={{ fontSize: 16, marginBottom: 8 }}>
            {t("tonight")}
          </H>
          <Card pad={12} style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 8,
                background:
                  "repeating-linear-gradient(135deg, #D4A574 0 8px, #C29663 8px 16px)",
              }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 550 }}>Spaghetti Carbonara</div>
              <div style={{ fontSize: 11, color: TB.text2 }}>30 min · Serves 4</div>
            </div>
          </Card>
        </div>

        <div>
          <H as="h3" style={{ fontSize: 16, marginBottom: 8 }}>
            {t("upcomingTasks")}
          </H>
          <Card pad={0}>
            {[
              "Pay Comcast bill · due Fri",
              "Emma — permission slip · Mon",
              "Order birthday gift · next week",
            ].map((task, i) => (
              <div
                key={i}
                style={{
                  padding: "10px 12px",
                  borderBottom: i < 2 ? `1px solid ${TB.borderSoft}` : "none",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <div
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: 4,
                    border: `1.5px solid ${TB.border}`,
                  }}
                />
                <div style={{ fontSize: 12 }}>{task}</div>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}

/**
 * Upcoming birthdays + anniversaries — shows yearly-recurring events whose
 * next occurrence falls in the next 60 days. Pulled from the same /v1/events
 * stream the rest of the dashboard uses; tagged via `recurrence_rule` set
 * from the EventModal "Repeat" dropdown.
 */
function CelebrationsCard({
  events,
}: {
  events: ReadonlyArray<{
    id: string;
    title: string;
    start_time?: string;
    start?: string;
    recurrence_rule?: string;
  }>;
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const horizon = new Date(today);
  horizon.setDate(horizon.getDate() + 60);

  const upcoming = events
    .filter((e) => (e.recurrence_rule ?? "").toUpperCase().includes("FREQ=YEARLY"))
    .map((e) => {
      const startStr = e.start_time ?? (e.start && e.start.includes("T") ? e.start : null);
      if (!startStr) return null;
      const orig = new Date(startStr);
      // Compute next anniversary occurrence on or after today.
      const next = new Date(today.getFullYear(), orig.getMonth(), orig.getDate());
      if (next < today) next.setFullYear(next.getFullYear() + 1);
      return next <= horizon ? { id: e.id, title: e.title, when: next } : null;
    })
    .filter((x): x is { id: string; title: string; when: Date } => x !== null)
    .sort((a, b) => a.when.getTime() - b.when.getTime())
    .slice(0, 4);

  if (upcoming.length === 0) return null;

  return (
    <div data-testid="celebrations-card">
      <H as="h3" style={{ fontSize: 16, marginBottom: 8 }}>
        Celebrations
      </H>
      <Card pad={0}>
        {upcoming.map((c, i) => {
          const days = Math.round(
            (c.when.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
          );
          return (
            <div
              key={c.id}
              style={{
                padding: 12,
                borderBottom: i < upcoming.length - 1 ? `1px solid ${TB.borderSoft}` : "none",
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <Icon name="star" size={18} color={TB.warning} />
              <div style={{ flex: 1, fontSize: 13, fontWeight: 550 }}>{c.title}</div>
              <div style={{ fontSize: 11, color: TB.text2, fontFamily: TB.fontMono }}>
                {days === 0 ? "TODAY" : days === 1 ? "TOMORROW" : `IN ${days}d`}
              </div>
            </div>
          );
        })}
      </Card>
    </div>
  );
}

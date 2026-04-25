"use client";

import Link from "next/link";
import { TB } from "@/lib/tokens";
import { fmtTime, getMembers } from "@/lib/data";
import { Icon, type IconName } from "@/components/ui/icon";
import { Avatar, StackedAvatars } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Btn } from "@/components/ui/button";
import { H } from "@/components/ui/heading";
import { useEvents, useMembers } from "@/lib/api/hooks";
import { useTranslations } from "next-intl";

export function DashDesktop() {
  const t = useTranslations("dashboard");
  const tNav = useTranslations("nav");
  const { data: apiMembers } = useMembers();
  const { data: apiEvents } = useEvents();
  const members = apiMembers ?? [];
  const events = apiEvents ?? [];

  const NAV: { i: IconName; l: string; href: string; active?: boolean }[] = [
    { i: "calendar", l: tNav("calendar"), href: "/calendar", active: true },
    { i: "checkCircle", l: tNav("routines"), href: "/routines" },
    { i: "list", l: tNav("lists"), href: "/lists" },
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
        {members.map((m) => (
          <div
            key={m.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "8px",
              borderRadius: 8,
              cursor: "pointer",
              background: m.id === "mom" ? TB.bg2 : "transparent",
            }}
          >
            <Avatar member={m} size={30} ring={false} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 550,
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
        ))}
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
            <Btn kind="secondary" size="sm" icon="search">
              {t("search")}
            </Btn>
            <Btn kind="primary" size="sm" icon="plus">
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
            <Icon name="sun" size={40} color={TB.warning} />
            <div>
              <div
                style={{
                  fontFamily: TB.fontDisplay,
                  fontSize: 28,
                  fontWeight: 500,
                }}
              >
                72°
              </div>
              <div style={{ fontSize: 12, color: TB.text2 }}>
                Partly sunny · H 78 · L 58
              </div>
            </div>
          </Card>
        </div>

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

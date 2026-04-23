"use client";

import { useState } from "react";
import { TB } from "@/lib/tokens";
import { TBD, fmtTime, getMember, getMembers } from "@/lib/data";
import { Icon } from "@/components/ui/icon";
import { Avatar, StackedAvatars } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { H } from "@/components/ui/heading";
import { BottomNav } from "./bottom-nav";
import { useEvents, useMembers } from "@/lib/api/hooks";
import { useTranslations } from "next-intl";

const KIOSK_TABS = [
  { n: "calendar" as const, l: "Calendar" },
  { n: "checkCircle" as const, l: "Routines" },
  { n: "list" as const, l: "Lists" },
  { n: "chef" as const, l: "Meals" },
  { n: "star" as const, l: "Stars" },
  { n: "flag" as const, l: "Races" },
];

export function DashKiosk({ dark = false }: { dark?: boolean }) {
  const t = useTranslations("dashboard");
  const tNav = useTranslations("nav");
  const tRecipe = useTranslations("recipe");
  const [sel, setSel] = useState("jackson");
  const { data: apiMembers } = useMembers();
  const { data: apiEvents } = useEvents();
  const members = apiMembers && apiMembers.length > 0 ? apiMembers : TBD.members;
  const events = apiEvents && apiEvents.length > 0 ? apiEvents : TBD.events;
  const selMember = members.find((m) => m.id === sel) ?? getMember(sel);
  const bg = dark ? TB.dBg : TB.bg;
  const tc = dark ? TB.dText : TB.text;
  const tc2 = dark ? TB.dText2 : TB.text2;
  const border = dark ? TB.dBorder : TB.border;

  const kioskTabs = [
    { n: "calendar" as const, l: tNav("calendar"), href: "/calendar" },
    { n: "checkCircle" as const, l: tNav("routines"), href: "/routines" },
    { n: "list" as const, l: tNav("lists"), href: "/lists" },
    { n: "chef" as const, l: tNav("meals"), href: "/meals" },
    { n: "star" as const, l: tNav("equity"), href: "/equity" },
    { n: "flag" as const, l: tNav("race"), href: "/race" },
  ];

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
          padding: "28px 32px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: `1px solid ${border}`,
        }}
      >
        <div>
          <div
            style={{
              fontFamily: TB.fontDisplay,
              fontSize: 64,
              fontWeight: 500,
              letterSpacing: "-0.03em",
              lineHeight: 1,
              color: tc,
            }}
          >
            10:34
          </div>
          <div style={{ marginTop: 6, fontSize: 15, color: tc2, fontWeight: 500 }}>
            Thursday, April 22
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ textAlign: "right" }}>
            <div
              style={{
                fontFamily: TB.fontDisplay,
                fontSize: 40,
                fontWeight: 500,
                lineHeight: 1,
                color: tc,
              }}
            >
              72°
            </div>
            <div style={{ fontSize: 12, color: tc2, marginTop: 2 }}>{t("partlySunny")}</div>
          </div>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: "50%",
              background: `${TB.warning}22`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name="sun" size={28} color={TB.warning} />
          </div>
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        <div
          style={{
            width: 124,
            borderRight: `1px solid ${border}`,
            padding: "20px 0",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 18,
            background: dark ? TB.dBg : TB.bg,
          }}
        >
          {members.map((m) => (
            <div
              key={m.id}
              onClick={() => setSel(m.id)}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
                cursor: "pointer",
              }}
            >
              <Avatar member={m} size={62} selected={sel === m.id} />
              <div
                style={{
                  fontSize: 12,
                  fontWeight: sel === m.id ? 600 : 450,
                  color: sel === m.id ? tc : tc2,
                }}
              >
                {m.name}
              </div>
            </div>
          ))}
          <div style={{ flex: 1 }} />
          <Card pad={12} dark={dark} style={{ width: 96, textAlign: "center" }}>
            <div style={{ fontSize: 11, color: tc2, marginBottom: 4 }}>{selMember.name}</div>
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: 4,
              }}
            >
              <Icon name="star" size={16} color={TB.warning} />
              <div style={{ fontFamily: TB.fontDisplay, fontSize: 20, fontWeight: 600 }}>
                {selMember.stars}
              </div>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: 4,
                marginTop: 6,
              }}
            >
              <Icon name="flame" size={14} color="#F97316" />
              <div style={{ fontSize: 13, fontWeight: 600, color: "#F97316" }}>
                {t("streak", { n: selMember.streak })}
              </div>
            </div>
          </Card>
        </div>

        <div style={{ flex: 1, padding: 28, overflow: "auto" }}>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              marginBottom: 14,
            }}
          >
            <H as="h2" style={{ color: tc, fontSize: 26 }}>
              {t("todaysSchedule")}
            </H>
            <div style={{ fontSize: 13, color: tc2, fontFamily: TB.fontMono }}>
              {t("eventsShort", { count: events.length })}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {events.map((e) => {
              const ms = getMembers(e.members);
              const accent = ms.length > 1 ? TB.primary : ms[0].color;
              return (
                <Card
                  key={e.id}
                  dark={dark}
                  pad={0}
                  style={{
                    display: "flex",
                    alignItems: "stretch",
                    overflow: "hidden",
                  }}
                >
                  <div style={{ width: 4, background: accent }} />
                  <div
                    style={{
                      flex: 1,
                      padding: "14px 16px",
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                    }}
                  >
                    <div style={{ minWidth: 84 }}>
                      <div
                        style={{
                          fontFamily: TB.fontMono,
                          fontSize: 13,
                          color: tc,
                          fontWeight: 500,
                        }}
                      >
                        {fmtTime(e.start)}
                      </div>
                      <div
                        style={{
                          fontFamily: TB.fontMono,
                          fontSize: 11,
                          color: tc2,
                        }}
                      >
                        {fmtTime(e.end)}
                      </div>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 16,
                          fontWeight: 550,
                          color: tc,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {e.title}
                      </div>
                      {e.location && (
                        <div
                          style={{
                            fontSize: 12,
                            color: tc2,
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
                </Card>
              );
            })}
          </div>

          <div style={{ marginTop: 20 }}>
            <H as="h3" style={{ color: tc, marginBottom: 10 }}>
              {t("whatsForDinner")}
            </H>
            <Card
              dark={dark}
              pad={0}
              style={{ display: "flex", alignItems: "stretch", overflow: "hidden" }}
            >
              <div
                style={{
                  width: 96,
                  background:
                    "repeating-linear-gradient(135deg, #D4A574 0 10px, #C29663 10px 20px)",
                }}
              />
              <div style={{ flex: 1, padding: 16 }}>
                <div
                  style={{
                    fontSize: 11,
                    color: tc2,
                    fontFamily: TB.fontMono,
                    letterSpacing: "0.06em",
                  }}
                >
                  PASTA · {tRecipe("serves", { n: 4 }).toUpperCase()} · 30 MIN
                </div>
                <div
                  style={{
                    fontFamily: TB.fontDisplay,
                    fontSize: 22,
                    fontWeight: 500,
                    marginTop: 4,
                    color: tc,
                  }}
                >
                  Spaghetti Carbonara
                </div>
                <div style={{ fontSize: 13, color: tc2, marginTop: 4 }}>
                  {t("tapForRecipe")}
                </div>
              </div>
              <div style={{ padding: 16, display: "flex", alignItems: "center" }}>
                <Icon name="chevronR" size={22} color={tc2} />
              </div>
            </Card>
          </div>
        </div>
      </div>

      <BottomNav
        dark={dark}
        active={0}
        tabs={kioskTabs}
      />
    </div>
  );
}

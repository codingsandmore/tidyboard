"use client";

import { TB } from "@/lib/tokens";
import { TBD, fmtTime, getMembers } from "@/lib/data";
import { Icon } from "@/components/ui/icon";
import { Avatar, StackedAvatars } from "@/components/ui/avatar";
import { Btn } from "@/components/ui/button";
import { useEvents, useMembers } from "@/lib/api/hooks";
import { useTranslations } from "next-intl";

export function DashKioskAmbient() {
  const t = useTranslations("dashboard");
  const { data: apiMembers } = useMembers();
  const { data: apiEvents } = useEvents();
  const members = apiMembers && apiMembers.length > 0 ? apiMembers : TBD.members;
  const events = apiEvents && apiEvents.length > 0 ? apiEvents : TBD.events;
  const nextEvent = events.find((e) => e.start >= "10:34") ?? events[0];
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "#EEEAE3",
        color: TB.text,
        fontFamily: TB.fontBody,
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
        padding: 20,
        gap: 14,
      }}
    >
      <div
        style={{
          background: TB.surface,
          borderRadius: 20,
          padding: 24,
          boxShadow: TB.shadow,
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div
            style={{
              fontFamily: TB.fontDisplay,
              fontSize: 96,
              fontWeight: 500,
              letterSpacing: "-0.04em",
              lineHeight: 0.9,
              color: TB.text,
            }}
          >
            10:34
          </div>
          <div style={{ marginTop: 8, fontSize: 16, color: TB.text2, fontWeight: 500 }}>
            Thursday, April 22
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <Icon name="sun" size={48} color={TB.warning} />
          <div
            style={{
              fontFamily: TB.fontDisplay,
              fontSize: 36,
              fontWeight: 500,
              marginTop: 4,
            }}
          >
            72°
          </div>
        </div>
      </div>

      <div
        style={{
          background: TB.primary,
          color: "#fff",
          borderRadius: 20,
          padding: 20,
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontFamily: TB.fontMono,
            letterSpacing: "0.1em",
            opacity: 0.8,
          }}
        >
          {t("nextUpIn", { min: 26 })}
        </div>
        <div
          style={{
            fontFamily: TB.fontDisplay,
            fontSize: 28,
            fontWeight: 500,
            marginTop: 6,
          }}
        >
          {nextEvent.title}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 10 }}>
          <StackedAvatars members={getMembers(nextEvent.members)} size={28} />
          <div style={{ fontSize: 13, opacity: 0.92 }}>
            {fmtTime(nextEvent.start)} · {nextEvent.location}
          </div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
          flex: 1,
          minHeight: 0,
        }}
      >
        {members.map((m) => {
          const evs = events.filter((e) => e.members.includes(m.id));
          return (
            <div
              key={m.id}
              style={{
                background: TB.surface,
                borderRadius: 16,
                padding: 14,
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Avatar member={m} size={34} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{m.name}</div>
                  <div style={{ fontSize: 11, color: TB.text2 }}>{t("todayCount", { count: evs.length })}</div>
                </div>
                {m.role === "child" && (
                  <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                    <Icon name="star" size={12} color={TB.warning} />
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{m.stars}</div>
                  </div>
                )}
              </div>
              <div
                style={{
                  marginTop: 10,
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                  overflow: "hidden",
                }}
              >
                {evs.slice(0, 3).map((e) => (
                  <div
                    key={e.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      fontSize: 11,
                    }}
                  >
                    <div
                      style={{
                        width: 4,
                        height: 4,
                        borderRadius: "50%",
                        background: m.color,
                      }}
                    />
                    <div
                      style={{
                        fontFamily: TB.fontMono,
                        color: TB.text2,
                        width: 46,
                      }}
                    >
                      {fmtTime(e.start).replace(":00", "")}
                    </div>
                    <div
                      style={{
                        flex: 1,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {e.title}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div
        style={{
          background: TB.surface,
          borderRadius: 16,
          padding: 14,
          display: "flex",
          alignItems: "center",
          gap: 14,
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 12,
            background:
              "repeating-linear-gradient(135deg, #D4A574 0 8px, #C29663 8px 16px)",
          }}
        />
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 11,
              fontFamily: TB.fontMono,
              color: TB.text2,
              letterSpacing: "0.06em",
            }}
          >
            {t("tonightTime", { time: "6:30 PM" })}
          </div>
          <div
            style={{
              fontFamily: TB.fontDisplay,
              fontSize: 20,
              fontWeight: 500,
              marginTop: 2,
            }}
          >
            Spaghetti Carbonara
          </div>
        </div>
        <Btn kind="ghost" size="sm" iconRight="chevronR">
          {t("recipe")}
        </Btn>
      </div>
    </div>
  );
}

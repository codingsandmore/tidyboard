"use client";

import { useRouter } from "next/navigation";
import { TB } from "@/lib/tokens";
import { fmtTime } from "@/lib/data";
import { Icon } from "@/components/ui/icon";
import { Avatar } from "@/components/ui/avatar";
import { Btn } from "@/components/ui/button";
import { BottomNav } from "./bottom-nav";
import { useEvents, useMembers } from "@/lib/api/hooks";
import { useTranslations } from "next-intl";

export function DashKioskColumns() {
  const t = useTranslations("dashboard");
  const tNav = useTranslations("nav");
  const router = useRouter();
  const { data: apiMembers } = useMembers();
  const { data: apiEvents } = useEvents();
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
          padding: "18px 24px 14px",
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          borderBottom: `1px solid ${TB.border}`,
        }}
      >
        <div>
          <div
            style={{
              fontFamily: TB.fontDisplay,
              fontSize: 38,
              fontWeight: 500,
              letterSpacing: "-0.03em",
              lineHeight: 1,
            }}
          >
            Thursday
          </div>
          <div style={{ fontSize: 13, color: TB.text2, marginTop: 4 }}>
            April 22 · 10:34 AM · 72° partly sunny
          </div>
        </div>
        <Btn kind="secondary" size="sm" icon="plus" onClick={() => router.push("/calendar/event?new=1")}>
          {t("event")}
        </Btn>
      </div>

      <div style={{ flex: 1, display: "flex", minHeight: 0, overflow: "hidden" }}>
        <div
          style={{
            width: 46,
            paddingTop: 8,
            borderRight: `1px solid ${TB.borderSoft}`,
            position: "relative",
          }}
        >
          {hours.map((h) => (
            <div
              key={h}
              style={{
                position: "absolute",
                top: `calc(${toY(h)}% - 7px)`,
                right: 8,
                fontSize: 10,
                fontFamily: TB.fontMono,
                color: TB.muted,
              }}
            >
              {((h + 11) % 12) + 1}
              {h < 12 ? "a" : "p"}
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
                borderRight: `1px solid ${TB.borderSoft}`,
                display: "flex",
                flexDirection: "column",
                minWidth: 0,
              }}
            >
              <div style={{ padding: "10px", background: m.color, color: "#fff" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Avatar
                    member={m}
                    size={28}
                    ring={false}
                    style={{ border: "2px solid #fff" }}
                  />
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{m.name}</div>
                </div>
                <div style={{ fontSize: 11, opacity: 0.9, marginTop: 3 }}>
                  {t("eventsShort", { count: evs.length })}
                </div>
              </div>
              <div style={{ flex: 1, position: "relative", background: TB.surface }}>
                {hours.map((h) => (
                  <div
                    key={h}
                    style={{
                      position: "absolute",
                      left: 0,
                      right: 0,
                      top: `${toY(h)}%`,
                      height: 1,
                      background: TB.borderSoft,
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
                        left: 4,
                        right: 4,
                        borderRadius: 6,
                        background: m.color + "22",
                        borderLeft: `3px solid ${m.color}`,
                        padding: "4px 6px",
                        overflow: "hidden",
                        display: "flex",
                        flexDirection: "column",
                        gap: 2,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: TB.text,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {e.title}
                      </div>
                      <div
                        style={{ fontSize: 9, color: TB.text2, fontFamily: TB.fontMono }}
                      >
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

      <BottomNav
        compact
        active={0}
        tabs={[
          { n: "calendar", l: tNav("calendar"), href: "/calendar" },
          { n: "checkCircle", l: tNav("routines"), href: "/routines" },
          { n: "list", l: tNav("lists"), href: "/lists" },
          { n: "chef", l: tNav("meals"), href: "/meals" },
          { n: "star", l: tNav("equity"), href: "/equity" },
          { n: "flag", l: tNav("race"), href: "/race" },
        ]}
      />
    </div>
  );
}

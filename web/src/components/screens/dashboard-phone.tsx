"use client";

import { TB } from "@/lib/tokens";
import { fmtTime, getMembers } from "@/lib/data";
import { Icon } from "@/components/ui/icon";
import { Avatar, StackedAvatars } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { BottomNav } from "./bottom-nav";
import { useEvents, useMembers } from "@/lib/api/hooks";
import { useTranslations } from "next-intl";

export function DashPhone() {
  const tNav = useTranslations("nav");
  const tDash = useTranslations("dashboard");
  const { data: apiMembers } = useMembers();
  const { data: apiEvents } = useEvents();
  const members = apiMembers ?? [];
  const events = apiEvents ?? [];
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
          padding: "14px 20px 12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: TB.surface,
          borderBottom: `1px solid ${TB.borderSoft}`,
        }}
      >
        <Icon name="menu" size={22} color={TB.text2} />
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
        {members[1] && <Avatar member={members[1]} size={30} ring={false} />}
      </div>

      <div style={{ flex: 1, overflow: "auto", padding: "16px 16px 8px" }}>
        <div style={{ marginBottom: 12 }}>
          <div
            style={{
              fontFamily: TB.fontDisplay,
              fontSize: 24,
              fontWeight: 500,
              letterSpacing: "-0.02em",
            }}
          >
            Thursday
          </div>
          <div style={{ fontSize: 13, color: TB.text2, marginTop: 2 }}>
            April 22 · 72° · 7 events
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {events.length === 0 && (
            <div style={{ padding: "20px 0", textAlign: "center", color: TB.text2, fontSize: 13 }}>
              {tDash("noEvents")}
            </div>
          )}
          {events.slice(0, 5).map((e) => {
            const ms = getMembers(e.members);
            const accent = ms.length > 1 ? TB.primary : ms[0].color;
            return (
              <Card
                key={e.id}
                pad={0}
                style={{
                  overflow: "hidden",
                  display: "flex",
                  alignItems: "stretch",
                }}
              >
                <div style={{ width: 3, background: accent }} />
                <div style={{ flex: 1, padding: "11px 12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <StackedAvatars members={ms} size={18} />
                    <div style={{ fontSize: 14, fontWeight: 550, flex: 1 }}>{e.title}</div>
                  </div>
                  <div
                    style={{
                      marginTop: 3,
                      fontSize: 11,
                      color: TB.text2,
                      fontFamily: TB.fontMono,
                    }}
                  >
                    {fmtTime(e.start)} – {fmtTime(e.end)}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        <Card
          pad={0}
          style={{ marginTop: 12, overflow: "hidden", display: "flex" }}
        >
          <div
            style={{
              width: 54,
              background:
                "repeating-linear-gradient(135deg, #D4A574 0 8px, #C29663 8px 16px)",
            }}
          />
          <div style={{ flex: 1, padding: "10px 12px" }}>
            <div
              style={{
                fontSize: 10,
                fontFamily: TB.fontMono,
                color: TB.text2,
                letterSpacing: "0.06em",
              }}
            >
              TONIGHT · 6:30
            </div>
            <div
              style={{
                fontSize: 15,
                fontWeight: 550,
                fontFamily: TB.fontDisplay,
                marginTop: 2,
              }}
            >
              Spaghetti Carbonara
            </div>
          </div>
          <div style={{ padding: "0 12px", display: "flex", alignItems: "center" }}>
            <Icon name="chevronR" size={18} color={TB.text2} />
          </div>
        </Card>
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
        ]}
      />
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { TB } from "@/lib/tokens";
import { fmtTime } from "@/lib/time";
import type { Member } from "@/lib/data";
import { Icon } from "@/components/ui/icon";
import { Avatar, StackedAvatars } from "@/components/ui/avatar";
import { Btn } from "@/components/ui/button";
import { PageShell } from "@/components/layout/page-shell";
import { useEvents, useMembers } from "@/lib/api/hooks";
import { useTranslations } from "next-intl";

// Ambient warm-paper background — soft variant of TB.bg2 used only on the
// kiosk-ambient screen. Held in a token-named constant so the JSX has no
// raw hex literals.
const AMBIENT_BG = "#EEEAE3";

// Same warm-tan stripe used by the meal-plan placeholder on phone.
const MEAL_STRIPE = `repeating-linear-gradient(135deg, ${TB.secondary} 0 8px, #C29663 8px 16px)`;

export function DashKioskAmbient() {
  const t = useTranslations("dashboard");
  const router = useRouter();
  const { data: apiMembers } = useMembers();
  const { data: apiEvents } = useEvents();
  const members = apiMembers ?? [];
  const events = apiEvents ?? [];
  const nextEvent = events[0];
  const now = new Date();
  const timeLabel = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(now);
  const dateLabel = new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(now);
  const memberById = new Map(members.map((member) => [member.id, member]));
  const resolveEventMembers = (ids: string[]): Member[] =>
    ids
      .map((id) => memberById.get(id))
      .filter((member): member is Member => Boolean(member));

  const footer = (
    <div
      style={{
        background: TB.surface,
        borderRadius: TB.r.lg,
        padding: 14,
        margin: "0 20px 20px",
        display: "flex",
        alignItems: "center",
        gap: 14,
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: TB.r.md,
          background: MEAL_STRIPE,
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
          No dinner planned
        </div>
      </div>
      <Btn kind="ghost" size="sm" iconRight="chevronR" onClick={() => router.push("/recipes")}>
        {t("recipe")}
      </Btn>
    </div>
  );

  return (
    <PageShell
      background={AMBIENT_BG}
      footer={footer}
      contentStyle={{
        padding: "20px 20px 14px",
        display: "flex",
        flexDirection: "column",
        gap: 14,
        overflow: "hidden",
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
            {timeLabel}
          </div>
          <div style={{ marginTop: 8, fontSize: 16, color: TB.text2, fontWeight: 500 }}>
            {dateLabel}
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
            —
          </div>
        </div>
      </div>

      <div
        style={{
          background: TB.primary,
          color: TB.primaryFg,
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
        {nextEvent ? (
          <>
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
              <StackedAvatars members={resolveEventMembers(nextEvent.members)} size={28} />
              <div style={{ fontSize: 13, opacity: 0.92 }}>
                {fmtTime(nextEvent.start)} · {nextEvent.location}
              </div>
            </div>
          </>
        ) : (
          <div style={{ fontSize: 18, fontWeight: 500, marginTop: 6, opacity: 0.85 }}>
            {t("noEvents")}
          </div>
        )}
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
          const evs = events.filter((e) => (e.assigned_members ?? e.members ?? []).includes(m.id));
          return (
            <div
              key={m.id}
              style={{
                background: TB.surface,
                borderRadius: TB.r.xl,
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
                        borderRadius: TB.r.full,
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
    </PageShell>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { TB } from "@/lib/tokens";
import {
  fmtTime,
  type MealPlan,
  type Member,
  type Recipe,
  type TBDEvent,
} from "@/lib/data";
import { Icon } from "@/components/ui/icon";
import { Avatar, StackedAvatars } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { H } from "@/components/ui/heading";
import { BottomNav } from "./bottom-nav";
import {
  useLiveEvents,
  useLiveLists,
  useLiveMealPlan,
  useLiveMembers,
  useLiveRecipes,
  useLiveRoutines,
  useHousehold,
} from "@/lib/api/hooks";
import { useWeather } from "@/lib/weather/use-weather";
import { useAuth } from "@/lib/auth/auth-store";
import { useTranslations } from "next-intl";

export function DashKiosk({ dark = false }: { dark?: boolean }) {
  const t = useTranslations("dashboard");
  const tNav = useTranslations("nav");
  const [sel, setSel] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());
  const { data: apiMembers } = useLiveMembers();
  const { lockKiosk, status, activeMember, setActiveMember, household } = useAuth();
  const { data: apiEvents } = useLiveEvents();
  const { data: routines } = useLiveRoutines();
  const { data: lists } = useLiveLists();
  const { data: recipes } = useLiveRecipes();
  const { data: mealPlan } = useLiveMealPlan();
  const { data: householdRecord } = useHousehold(household?.id);
  const weatherCoords = getHouseholdWeatherCoords(householdRecord?.settings);
  const { data: weather } = useWeather(weatherCoords, { enabled: Boolean(weatherCoords) });
  const router = useRouter();
  const members = apiMembers ?? [];
  const activeMemberTargets = members.filter((member) => member.role !== "pet");
  const events = apiEvents ?? [];
  const activeMemberId = activeMemberTargets.some((member) => member.id === activeMember?.id)
    ? activeMember?.id ?? null
    : null;
  const selectedMemberId = sel ?? activeMemberId;
  const selMember = activeMemberTargets.find((m) => m.id === selectedMemberId) ?? activeMemberTargets[0];
  const memberById = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);
  const displayedEvents = useMemo(
    () => filterEventsForMember(events, selectedMemberId),
    [events, selectedMemberId]
  );
  const dinnerRecipe = useMemo(
    () => findDinnerRecipe(now, mealPlan, recipes ?? []),
    [mealPlan, now, recipes]
  );
  const openListCount = (lists ?? []).reduce(
    (count, list) => count + list.items.filter((item) => !item.done).length,
    0
  );
  const bg = dark ? TB.dBg : TB.bg;
  const tc = dark ? TB.dText : TB.text;
  const tc2 = dark ? TB.dText2 : TB.text2;
  const border = dark ? TB.dBorder : TB.border;

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

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
              letterSpacing: 0,
              lineHeight: 1,
              color: tc,
            }}
          >
            {formatClock(now)}
          </div>
          <div style={{ marginTop: 6, fontSize: 15, color: tc2, fontWeight: 500 }}>
            {formatDate(now)}
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
              {weather ? `${weather.tempNow}°` : "—"}
            </div>
            <div style={{ fontSize: 12, color: tc2, marginTop: 2 }}>
              {weather ? weather.label : "Weather unavailable"}
            </div>
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
          {status === "authenticated" && (
            <button
              data-testid="kiosk-lock-btn"
              onClick={() => {
                lockKiosk();
                router.push("/kiosk");
              }}
              title="Lock screen"
              style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                background: dark ? "rgba(255,255,255,0.08)" : TB.bg2,
                border: `1px solid ${border}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              <Icon name="lock" size={20} color={tc2} />
            </button>
          )}
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
          {activeMemberTargets.map((m) => {
            const isSelected = selectedMemberId === m.id;
            return (
              <div
                key={m.id}
                data-testid={`dashboard-member-${m.id}`}
                onClick={() => {
                  if (isSelected) {
                    setSel(null);
                    setActiveMember(null);
                  } else {
                    setSel(m.id);
                    setActiveMember({
                      id: m.id,
                      name: m.name,
                      role: m.role === "child" ? "child" : "adult",
                    });
                  }
                }}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 4,
                  cursor: "pointer",
                }}
              >
                <Avatar member={m} size={62} selected={isSelected} />
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: isSelected ? 600 : 450,
                    color: isSelected ? tc : tc2,
                  }}
                >
                  {m.name}
                </div>
              </div>
            );
          })}
          <div style={{ flex: 1 }} />
          {selMember && (
            <Card pad={12} dark={dark} style={{ width: 96, textAlign: "center" }}>
              <div style={{ fontSize: 11, color: tc2, marginBottom: 4 }}>Viewing</div>
              <div style={{ fontFamily: TB.fontDisplay, fontSize: 20, fontWeight: 600 }}>
                {selMember.name}
              </div>
              <div style={{ fontSize: 12, color: tc2, marginTop: 6, textTransform: "capitalize" }}>
                {selMember.role}
              </div>
            </Card>
          )}
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
              {t("eventsShort", { count: displayedEvents.length })}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {displayedEvents.length === 0 && (
              <div style={{ padding: "24px 0", textAlign: "center", color: tc2, fontSize: 14 }}>
                Add calendar events to show today&apos;s household schedule.
              </div>
            )}
            {displayedEvents.map((e) => {
              const ms = getEventMembers(e, memberById);
              const accent = ms.length > 1 ? TB.primary : ms[0]?.color ?? TB.primary;
              return (
                <Card
                  key={e.id}
                  dark={dark}
                  pad={0}
                  role="button"
                  tabIndex={0}
                  onClick={() => router.push(`/calendar?event=${encodeURIComponent(e.id)}`)}
                  onKeyDown={(ev) => {
                    if (ev.key === "Enter" || ev.key === " ") {
                      ev.preventDefault();
                      router.push(`/calendar?event=${encodeURIComponent(e.id)}`);
                    }
                  }}
                  style={{
                    display: "flex",
                    alignItems: "stretch",
                    overflow: "hidden",
                    cursor: "pointer",
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
                        {formatEventTime(e.start_time ?? e.start)}
                      </div>
                      <div
                        style={{
                          fontFamily: TB.fontMono,
                          fontSize: 11,
                          color: tc2,
                        }}
                      >
                        {formatEventTime(e.end_time ?? e.end)}
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

          <div
            style={{
              marginTop: 20,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 12,
            }}
          >
            <KioskSummaryCard
              dark={dark}
              title={t("whatsForDinner")}
              value={dinnerRecipe?.title ?? "No dinner planned yet"}
              detail={
                dinnerRecipe
                  ? `${dinnerRecipe.total} min · serves ${dinnerRecipe.serves}`
                  : "Add meals from recipes to fill this tile."
              }
            />
            <KioskSummaryCard
              dark={dark}
              title="Routines"
              value={routines?.[0]?.name ?? "No routines set up yet"}
              detail={
                routines && routines.length > 0
                  ? `${routines.length} active routine${routines.length === 1 ? "" : "s"}`
                  : "Create routines for mornings, evenings, or chores."
              }
            />
            <KioskSummaryCard
              dark={dark}
              title="Lists"
              value={lists?.[0]?.title ?? "No lists yet"}
              detail={
                lists && lists.length > 0
                  ? `${openListCount} open item${openListCount === 1 ? "" : "s"}`
                  : "Create lists for packing, chores, or errands."
              }
            />
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

function formatClock(now: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(now);
}

function formatDate(now: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(now);
}

function formatEventTime(value: string): string {
  if (value.includes("T")) {
    return formatClock(new Date(value));
  }
  return fmtTime(value);
}

function filterEventsForMember(events: TBDEvent[], memberId: string | null): TBDEvent[] {
  if (!memberId) {
    return events;
  }
  return events.filter((event) => event.members.length === 0 || event.members.includes(memberId));
}

function getEventMembers(event: TBDEvent, memberById: Map<string, Member>): Member[] {
  return event.members.map((id) => memberById.get(id)).filter((m): m is Member => Boolean(m));
}

function findDinnerRecipe(now: Date, mealPlan: MealPlan | undefined, recipes: Recipe[]) {
  if (!mealPlan) {
    return undefined;
  }
  const dinnerIndex = mealPlan.rows.findIndex((row) => row.toLowerCase() === "dinner");
  if (dinnerIndex < 0) {
    return undefined;
  }
  const dayIndex = getMealPlanDayIndex(now, mealPlan.weekOf);
  const recipeId = mealPlan.grid[dinnerIndex]?.[dayIndex];
  return recipes.find((recipe) => recipe.id === recipeId);
}

function getMealPlanDayIndex(now: Date, weekOf: string): number {
  const weekStart = new Date(`${weekOf}T00:00:00`);
  if (Number.isNaN(weekStart.getTime())) {
    return now.getDay() === 0 ? 6 : now.getDay() - 1;
  }
  const diffDays = Math.floor(
    (startOfDay(now).getTime() - startOfDay(weekStart).getTime()) / 86_400_000
  );
  return Math.min(6, Math.max(0, diffDays));
}

function startOfDay(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function getHouseholdWeatherCoords(
  settings: Record<string, unknown> | undefined
): { lat: number; lon: number } | undefined {
  if (!settings) {
    return undefined;
  }
  const candidates = [
    { lat: settings.weather_latitude, lon: settings.weather_longitude },
    { lat: settings.weatherLat, lon: settings.weatherLon },
    { lat: settings.latitude, lon: settings.longitude },
  ];
  for (const candidate of candidates) {
    const lat = toFiniteNumber(candidate.lat);
    const lon = toFiniteNumber(candidate.lon);
    if (lat !== undefined && lon !== undefined) {
      return { lat, lon };
    }
  }
  return undefined;
}

function toFiniteNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

function KioskSummaryCard({
  dark,
  title,
  value,
  detail,
}: {
  dark: boolean;
  title: string;
  value: string;
  detail: string;
}) {
  const tc = dark ? TB.dText : TB.text;
  const tc2 = dark ? TB.dText2 : TB.text2;

  return (
    <Card dark={dark} pad={16}>
      <div
        style={{
          fontSize: 12,
          color: tc2,
          fontFamily: TB.fontMono,
          textTransform: "uppercase",
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontFamily: TB.fontDisplay,
          fontSize: 22,
          fontWeight: 500,
          marginTop: 8,
          color: tc,
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: 13, color: tc2, marginTop: 6 }}>{detail}</div>
    </Card>
  );
}

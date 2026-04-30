"use client";

import { useRouter } from "next/navigation";
import { TB } from "@/lib/tokens";
import type { Member } from "@/lib/data";
import { Icon, type IconName } from "@/components/ui/icon";
import { Avatar } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Btn } from "@/components/ui/button";
import { H } from "@/components/ui/heading";
import { useEquity, useEquityDashboard, useRebalanceSuggestions, useRace, useMembers } from "@/lib/api/hooks";
import type { ApiEquityDashboard, ApiRebalanceSuggestion } from "@/lib/api/types";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth/auth-store";

// ─── Pure helpers ────────────────────────────────────────────────────────────

export function arc(from: number, to: number, r: number): string {
  const a1 = from * 2 * Math.PI - Math.PI / 2;
  const a2 = to * 2 * Math.PI - Math.PI / 2;
  const x1 = Math.cos(a1) * r, y1 = Math.sin(a1) * r;
  const x2 = Math.cos(a2) * r, y2 = Math.sin(a2) * r;
  const large = (to - from) > 0.5 ? 1 : 0;
  return `M 0 0 L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
}

const LegendDot = ({ color, label }: { color: string; label: string }) => (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12 }}>
    <span style={{ width: 10, height: 10, borderRadius: "50%", background: color }} />
    {label}
  </span>
);

const LegendRow = ({
  color,
  label,
  value,
  dark,
}: {
  color: string;
  label: string;
  value: string;
  dark: boolean;
}) => (
  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
    <div style={{ width: 12, height: 12, borderRadius: 3, background: color }} />
    <div style={{ fontSize: 13, fontWeight: 550, color: dark ? TB.dText : TB.text }}>{label}</div>
    <div style={{ fontSize: 12, color: dark ? TB.dText2 : TB.text2, marginLeft: "auto", fontFamily: TB.fontMono }}>{value}</div>
  </div>
);

const LoadRow = ({
  member,
  status,
  label,
  detail,
  dark,
}: {
  member: Member;
  status: "green" | "yellow" | "red";
  label: string;
  detail: string;
  dark: boolean;
}) => {
  const colors = { green: TB.success, yellow: TB.warning, red: TB.destructive };
  const c = colors[status];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <Avatar member={member} size={34} ring={false} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 550, color: dark ? TB.dText : TB.text }}>{member.name}</div>
        <div style={{ fontSize: 11, color: dark ? TB.dText2 : TB.text2 }}>{detail}</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", background: c + "18", borderRadius: 9999 }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: c }} />
        <div style={{ fontSize: 12, fontWeight: 600, color: c }}>{label}</div>
      </div>
    </div>
  );
};

const Ring = ({
  member,
  value,
  goal,
  dark,
}: {
  member: Member;
  value: number;
  goal: number;
  dark: boolean;
}) => {
  const pct = Math.min(1, value / goal);
  const C = 2 * Math.PI * 32;
  return (
    <div style={{ textAlign: "center" }}>
      <svg width="80" height="80" viewBox="-40 -40 80 80" style={{ transform: "rotate(-90deg)" }}>
        <circle r="32" fill="none" stroke={dark ? TB.dBg2 : TB.bg2} strokeWidth="6" />
        <circle r="32" fill="none" stroke={member.color} strokeWidth="6" strokeDasharray={`${C * pct} ${C}`} strokeLinecap="round" />
      </svg>
      <div style={{ marginTop: -58, fontFamily: TB.fontDisplay, fontWeight: 600, fontSize: 18, color: dark ? TB.dText : TB.text }}>{value}h</div>
      <div style={{ marginTop: 30, fontSize: 11, color: dark ? TB.dText2 : TB.text2 }}>{member.name} · {goal}h goal</div>
    </div>
  );
};

// ── Backend → legacy shape adapter ───────────────────────────────────────────

function adaptDashboard(api: ApiEquityDashboard, members: Member[]) {
  // Build member id → Member lookup
  const memberById: Record<string, Member> = {};
  for (const m of members) memberById[m.id] = m;

  // adults array: map ApiMemberEquity → EquityAdult-like shape
  const adults = api.members.map((me) => ({
    id: me.member_id,
    total: Math.round(me.total_minutes / 60 * 10) / 10,
    cognitive: Math.round(me.cognitive_minutes / 60 * 10) / 10,
    physical: Math.round(me.physical_minutes / 60 * 10) / 10,
    personalHrs: 0,
    personalGoal: 5,
    load: me.load_status as "green" | "yellow" | "red",
    loadPct: Math.round(me.load_pct),
  }));

  // domainList: map ApiDomainSummary → Domain-like shape
  const domainList = api.domain_list.map((d) => ({
    name: d.name,
    owner: d.owner_member_id ?? "",
    hours: Math.round(d.total_minutes / 60 * 10) / 10,
    tasks: d.task_count,
  }));

  // trend: convert per-member minutes map to weekly points
  // We use the first 2 members (sorted) as "mom" / "dad" slots
  const sortedMemberIds = api.members.map((m) => m.member_id).sort();
  const [id0, id1] = sortedMemberIds;
  const trend = api.trend.map((tp, i) => ({
    w: i === api.trend.length - 1 ? "This" : `W-${api.trend.length - 1 - i}`,
    mom: Math.round((tp.minutes[id0] ?? 0) / 60 * 10) / 10,
    dad: Math.round((tp.minutes[id1] ?? 0) / 60 * 10) / 10,
  }));

  return { period: `${api.from} – ${api.to}`, domains: api.domain_list.length, adults, domainList, trend };
}

// ─── Equity (full dashboard, desktop) ────────────────────────────────────────

export function Equity({ dark = false }: { dark?: boolean }) {
  const t = useTranslations("equity");
  // Try live backend first; legacy stub hook only returns data when backed by the API.
  const { data: liveData } = useEquityDashboard();
  const { data: stubData } = useEquity("This Week");
  const { data: suggestions } = useRebalanceSuggestions();

  const { data: membersData } = useMembers();
  const allMembers: Member[] = membersData ?? [];
  const memberById = new Map(allMembers.map((member) => [member.id, member]));
  const equityData = liveData
    ? adaptDashboard(liveData, allMembers)
    : stubData ?? null;

  const adults = allMembers.filter((m) => m.role === "adult");

  const bg = dark ? TB.dBg : TB.bg;
  const surf = dark ? TB.dElevated : TB.surface;
  const tc = dark ? TB.dText : TB.text;
  const tc2 = dark ? TB.dText2 : TB.text2;
  const border = dark ? TB.dBorder : TB.border;

  if (!equityData) {
    return (
      <div style={{ width: "100%", height: "100%", background: bg, color: tc, fontFamily: TB.fontBody, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 10 }}>
        <H as="h2" style={{ color: tc2, fontSize: 20 }}>{t("householdBalance")}</H>
        <div style={{ fontSize: 14, color: tc2 }}>{t("noEquityData")}</div>
      </div>
    );
  }

  const eq = equityData;

  return (
    <div style={{ width: "100%", height: "100%", background: bg, color: tc, fontFamily: TB.fontBody, padding: 24, boxSizing: "border-box", overflow: "auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 22 }}>
        <div>
          <H as="h1" style={{ fontSize: 32, color: tc }}>{t("householdBalance")}</H>
          <div style={{ fontSize: 13, color: tc2, marginTop: 4 }}>
            {t("distributed")} ·{" "}
            <span style={{ color: tc, fontWeight: 500 }}>April 20 – 26, 2026</span>
          </div>
        </div>
        <div style={{ display: "inline-flex", padding: 3, background: dark ? TB.dBg2 : TB.bg2, borderRadius: 8 }}>
          {[t("thisWeek"), t("thisMonth"), t("last3Months")].map((v, i) => (
            <div
              key={v}
              style={{
                padding: "6px 12px",
                borderRadius: 6,
                fontSize: 12,
                fontWeight: i === 0 ? 600 : 500,
                background: i === 0 ? surf : "transparent",
                color: i === 0 ? tc : tc2,
              }}
            >
              {v}
            </div>
          ))}
        </div>
      </div>

      {/* Top row: ownership + load + personal */}
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", gap: 16, marginBottom: 16 }}>
        {/* Ownership pie */}
        <Card dark={dark} pad={20}>
          <div style={{ fontSize: 13, fontWeight: 600, color: tc2, marginBottom: 12 }}>{t("domainOwnership")}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
            <svg width="140" height="140" viewBox="-70 -70 140 140">
              {adults.map((m, i) => {
                const slice = 1 / Math.max(adults.length, 1);
                return <path key={m.id} d={arc(i * slice, (i + 1) * slice, 60)} fill={m.color} />;
              })}
              <circle r="38" fill={surf} />
              <text x="0" y="-2" textAnchor="middle" fontFamily={TB.fontDisplay} fontWeight="600" fontSize="22" fill={tc}>{eq.domains}</text>
              <text x="0" y="14" textAnchor="middle" fontSize="9" fill={tc2}>DOMAINS</text>
            </svg>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
              {adults.map((m) => {
                const a = eq.adults.find((x) => x.id === m.id);
                const pct = a ? a.loadPct : 0;
                return (
                  <LegendRow key={m.id} color={m.color} label={m.name} value={`${pct}%`} dark={dark} />
                );
              })}
            </div>
          </div>
        </Card>

        {/* Load status */}
        <Card dark={dark} pad={20}>
          <div style={{ fontSize: 13, fontWeight: 600, color: tc2, marginBottom: 12 }}>{t("loadIndicator")}</div>
          {adults.map((m, i) => {
            const a = eq.adults.find((x) => x.id === m.id);
            const status: "green" | "yellow" | "red" = a?.load ?? "green";
            const statusLabel = status === "green" ? t("balanced") : status === "yellow" ? t("watch") : t("overloaded");
            const detail = a ? `${a.loadPct}% load this week` : "No data";
            return (
              <div key={m.id}>
                {i > 0 && <div style={{ height: 1, background: border, margin: "12px 0" }} />}
                <LoadRow member={m} status={status} label={statusLabel} detail={detail} dark={dark} />
              </div>
            );
          })}
          {suggestions && suggestions.length > 0 ? (
            <div style={{ marginTop: 14, fontSize: 11, color: TB.primary, fontWeight: 600 }}>
              {suggestions[0].reason}
            </div>
          ) : (
            <div style={{ marginTop: 14, fontSize: 11, color: TB.primary, fontWeight: 600, cursor: "pointer" }}>{t("suggestRebalance")}</div>
          )}
        </Card>

        {/* Personal time */}
        <Card dark={dark} pad={20}>
          <div style={{ fontSize: 13, fontWeight: 600, color: tc2, marginBottom: 12 }}>{t("personalTime")}</div>
          <div style={{ display: "flex", gap: 20, alignItems: "center", justifyContent: "space-around" }}>
            {adults.map((m) => {
              const a = eq.adults.find((x) => x.id === m.id);
              return (
                <Ring key={m.id} member={m} value={a?.personalHrs ?? 0} goal={a?.personalGoal ?? 5} dark={dark} />
              );
            })}
          </div>
        </Card>
      </div>

      {/* Time balance */}
      <Card dark={dark} pad={20} style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: tc2, marginBottom: 16 }}>{t("timeBalance")}</div>
        {adults.map((m) => {
          const a = eq.adults.find((x) => x.id === m.id);
          const max = 24;
          if (!a) return null;
          return (
            <div key={m.id} style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                <Avatar member={m} size={26} ring={false} />
                <div style={{ fontSize: 14, fontWeight: 550, flex: 1 }}>{m.name}</div>
                <div style={{ fontFamily: TB.fontMono, fontSize: 13, color: tc }}>
                  {a.total}h{" "}
                  <span style={{ color: tc2 }}>({a.cognitive}h cognitive · {a.physical}h physical)</span>
                </div>
              </div>
              <div style={{ height: 22, borderRadius: 6, background: dark ? TB.dBg2 : TB.bg2, overflow: "hidden", display: "flex" }}>
                <div style={{ width: `${(a.cognitive / max) * 100}%`, background: m.color, opacity: 0.95 }} />
                <div style={{ width: `${(a.physical / max) * 100}%`, background: m.color, opacity: 0.55 }} />
              </div>
            </div>
          );
        })}
        <div style={{ display: "flex", gap: 16, fontSize: 11, color: tc2, marginTop: 8 }}>
          <span>█ Cognitive (planning, remembering, organizing)</span>
          <span style={{ opacity: 0.6 }}>█ Physical (doing)</span>
        </div>
      </Card>

      {/* Trend + Domain list */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 16 }}>
        <Card dark={dark} pad={20}>
          <div style={{ fontSize: 13, fontWeight: 600, color: tc2, marginBottom: 12 }}>{t("fourWeekTrend")}</div>
          <svg width="100%" height="160" viewBox="0 0 300 160" preserveAspectRatio="none">
            {[0, 10, 20, 30].map((y) => (
              <line key={y} x1="30" x2="300" y1={10 + y * 4} y2={10 + y * 4} stroke={border} strokeDasharray="2 3" />
            ))}
            {[0, 10, 20, 30].map((y) => (
              <text key={y} x="4" y={14 + y * 4} fontSize="9" fill={tc2} fontFamily={TB.fontMono}>{30 - y}h</text>
            ))}
            {adults.map((m, mi) => {
              // trend stores hours keyed by sorted member index (mom/dad slots)
              const key = mi === 0 ? "mom" : "dad";
              return (
                <g key={m.id}>
                  <polyline
                    points={eq.trend.map((tp, i) => `${40 + i * 85},${130 - (tp[key as keyof typeof tp] as number) * 4}`).join(" ")}
                    fill="none"
                    stroke={m.color}
                    strokeWidth="2.5"
                  />
                  {eq.trend.map((tp, i) => (
                    <circle key={i} cx={40 + i * 85} cy={130 - (tp[key as keyof typeof tp] as number) * 4} r="4" fill={m.color} />
                  ))}
                </g>
              );
            })}
            {eq.trend.map((trend, i) => (
              <text key={i} x={40 + i * 85} y={152} fontSize="10" fill={tc2} textAnchor="middle" fontFamily={TB.fontMono}>{trend.w}</text>
            ))}
          </svg>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", fontSize: 12, marginTop: 8 }}>
            {adults.map((m) => (
              <LegendDot key={m.id} color={m.color} label={m.name} />
            ))}
          </div>
        </Card>

        <Card dark={dark} pad={0}>
          <div style={{ padding: 16, borderBottom: `1px solid ${border}`, display: "flex", alignItems: "center" }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: tc2, flex: 1 }}>{t("domainDetail")}</div>
          </div>
          <div style={{ maxHeight: 260, overflow: "auto" }}>
            {eq.domainList.map((dm) => {
              const m = memberById.get(dm.owner);
              return (
                <div
                  key={dm.name}
                  style={{
                    padding: "10px 16px",
                    borderBottom: `1px solid ${dark ? TB.dBorderSoft : TB.borderSoft}`,
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  {m && <Avatar member={m} size={24} ring={false} />}
                  <div style={{ flex: 1, fontSize: 13, fontWeight: 550 }}>{dm.name}</div>
                  <div style={{ fontFamily: TB.fontMono, fontSize: 11, color: tc2 }}>{dm.tasks} tasks</div>
                  <div style={{ fontFamily: TB.fontMono, fontSize: 12, color: tc, minWidth: 38, textAlign: "right", fontWeight: 500 }}>{dm.hours}h</div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ─── EquityScales (tablet scales metaphor) ────────────────────────────────────

export function EquityScales() {
  const t = useTranslations("equity");
  const { data: membersData } = useMembers();
  const { data: liveData } = useEquityDashboard();
  const { data: stubData } = useEquity("This Week");

  const allMembers: Member[] = membersData ?? [];
  const adults = allMembers.filter((m) => m.role === "adult");

  // Resolve equity adults from live API data only; do not manufacture demo state.
  const equityAdults = liveData
    ? adaptDashboard(liveData, allMembers).adults
    : stubData?.adults ?? [];

  // Use first two adults for the two-pan scale visualization
  const left = adults[0];
  const right = adults[1];
  const leftHours = left ? Math.round((equityAdults.find((a) => a.id === left.id)?.total ?? 0)) : 0;
  const rightHours = right ? Math.round((equityAdults.find((a) => a.id === right.id)?.total ?? 0)) : 0;
  const tilt = (leftHours - rightHours) * 1.5;

  return (
    <div style={{ width: "100%", height: "100%", background: TB.bg, color: TB.text, fontFamily: TB.fontBody, padding: 32, boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <H as="h1" style={{ fontSize: 30 }}>{t("theBalance")}</H>
        <div style={{ color: TB.text2, fontSize: 13, marginTop: 4 }}>{t("momCarrying")}</div>
      </div>
      <div style={{ flex: 1, background: TB.surface, borderRadius: 16, border: `1px solid ${TB.border}`, padding: 24, position: "relative" }}>
        <svg width="100%" height="280" viewBox="0 0 400 280">
          {/* pillar */}
          <rect x="196" y="60" width="8" height="180" fill="#A8A29E" rx="2" />
          <polygon points="160,240 240,240 220,260 180,260" fill="#78716C" />
          {/* beam */}
          <g transform={`rotate(${tilt} 200 60)`}>
            <rect x="60" y="56" width="280" height="8" fill="#44403C" rx="2" />
            {/* Left pan */}
            {left && (
              <g>
                <line x1="90" y1="60" x2="90" y2="100" stroke="#44403C" strokeWidth="2" />
                <ellipse cx="90" cy="110" rx="60" ry="10" fill={left.color} opacity="0.18" />
                <rect x="30" y="100" width="120" height="20" rx="6" fill={left.color} opacity="0.7" />
                <text x="90" y="135" textAnchor="middle" fontFamily={TB.fontDisplay} fontSize="24" fontWeight="600" fill={left.color}>{leftHours}h</text>
                <text x="90" y="152" textAnchor="middle" fontSize="11" fill={TB.text2}>{left.name}</text>
              </g>
            )}
            {/* Right pan */}
            {right && (
              <g>
                <line x1="310" y1="60" x2="310" y2="100" stroke="#44403C" strokeWidth="2" />
                <ellipse cx="310" cy="110" rx="48" ry="8" fill={right.color} opacity="0.18" />
                <rect x="262" y="102" width="96" height="16" rx="5" fill={right.color} opacity="0.7" />
                <text x="310" y="135" textAnchor="middle" fontFamily={TB.fontDisplay} fontSize="24" fontWeight="600" fill={right.color}>{rightHours}h</text>
                <text x="310" y="152" textAnchor="middle" fontSize="11" fill={TB.text2}>{right.name}</text>
              </g>
            )}
          </g>
        </svg>
        <div style={{ position: "absolute", bottom: 20, left: 0, right: 0, textAlign: "center" }}>
          <div style={{ display: "inline-block", padding: "12px 20px", background: TB.warning + "15", borderRadius: 12, border: `1px solid ${TB.warning}35` }}>
            <div style={{ fontSize: 13, color: "#92400E", fontWeight: 600 }}>{t("watchList")}</div>
            <div style={{ fontSize: 12, color: "#92400E", marginTop: 2 }}>{t("watchListDetail")}</div>
          </div>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {adults.map((m) => {
          const a = equityAdults.find((x) => x.id === m.id);
          return (
            <Card key={m.id} pad={14}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Avatar member={m} size={32} />
                <div style={{ fontWeight: 600 }}>{m.name}</div>
              </div>
              <div style={{ display: "flex", gap: 14, marginTop: 10, fontSize: 12, color: TB.text2 }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 600, color: TB.text, fontFamily: TB.fontDisplay }}>{a?.cognitive ?? 0}h</div>
                  {t("cognitive")}
                </div>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 600, color: TB.text, fontFamily: TB.fontDisplay }}>{a?.physical ?? 0}h</div>
                  {t("physical")}
                </div>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 600, color: TB.text, fontFamily: TB.fontDisplay }}>{a?.personalHrs ?? 0}h</div>
                  {t("personal")}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ─── Settings (iOS-style grouped list) ───────────────────────────────────────

export function Settings() {
  const t = useTranslations("settings");
  const tNav = useTranslations("nav");
  const { logout, household } = useAuth();
  const router = useRouter();
  const householdName = household?.name || "Tidyboard";

  function handleSignOut() {
    logout();
    router.push("/login");
  }

  // Household deletion endpoint isn't shipped yet (tracked in
  // BACKEND_STATUS.md). The button is rendered as visibly disabled so users
  // aren't tempted to click an action that wouldn't take effect.
  const deleteEnabled = false;
  const groups: { name: string; icon: IconName; desc: string }[] = [
    { name: t("groups.household"), icon: "home", desc: t("groups.householdDesc") },
    { name: t("groups.members"), icon: "users", desc: t("groups.membersDesc") },
    { name: t("groups.calendars"), icon: "calendar", desc: t("groups.calendarsDesc") },
    { name: t("groups.notifications"), icon: "bell", desc: t("groups.notificationsDesc") },
    { name: t("groups.displayKiosk"), icon: "grid", desc: t("groups.displayKioskDesc") },
    { name: t("groups.aiAutomations"), icon: "sparkles", desc: t("groups.aiAutomationsDesc") },
    { name: t("groups.backupPrivacy"), icon: "cloud", desc: t("groups.backupPrivacyDesc") },
    { name: t("groups.about"), icon: "settings", desc: t("groups.aboutDesc") },
  ];

  return (
    <div style={{ width: "100%", height: "100%", background: TB.bg, color: TB.text, fontFamily: TB.fontBody, display: "flex", flexDirection: "column", boxSizing: "border-box" }}>
      <div style={{ padding: "16px 20px", borderBottom: `1px solid ${TB.border}`, background: TB.surface }}>
        <H as="h2" style={{ fontSize: 22 }}>{tNav("settings")}</H>
      </div>
      <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
        <Card pad={0} style={{ marginBottom: 16 }}>
          <div style={{ padding: 14, display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: TB.primary + "18", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon name="home" size={22} color={TB.primary} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 600 }}>{householdName}</div>
              <div style={{ fontSize: 12, color: TB.text2 }}>
                Household settings
              </div>
            </div>
          </div>
        </Card>

        <Card pad={0}>
          {groups.map((g, i) => (
            <a
              key={g.name}
              href={`/settings#${g.name.toLowerCase().replace(/\s+/g, "-")}`}
              style={{
                padding: 14,
                display: "flex",
                alignItems: "center",
                gap: 14,
                borderBottom: i < groups.length - 1 ? `1px solid ${TB.borderSoft}` : "none",
                cursor: "pointer",
                textDecoration: "none",
                color: "inherit",
              }}
            >
              <Icon name={g.icon} size={18} color={TB.text2} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 550 }}>{g.name}</div>
                <div style={{ fontSize: 12, color: TB.text2 }}>{g.desc}</div>
              </div>
              <Icon name="chevronR" size={16} color={TB.muted} />
            </a>
          ))}
        </Card>

        <div style={{ marginTop: 18 }}>
          <Btn kind="secondary" full onClick={handleSignOut}>{t("signOut")}</Btn>
          <button
            type="button"
            disabled={!deleteEnabled}
            title="Household deletion is planned for v0.2"
            style={{
              marginTop: 10,
              padding: "10px 14px",
              color: TB.destructive,
              textAlign: "center",
              fontSize: 13,
              fontWeight: 500,
              cursor: deleteEnabled ? "pointer" : "not-allowed",
              opacity: deleteEnabled ? 1 : 0.45,
              background: "transparent",
              border: "none",
              width: "100%",
            }}
          >
            {t("deleteHousehold")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Race (tablet race view) ──────────────────────────────────────────────────

export function Race() {
  const t = useTranslations("race");
  const { data: apiRace } = useRace();
  const { data: membersData } = useMembers();
  const memberById = new Map((membersData ?? []).map((member) => [member.id, member]));

  if (!apiRace) {
    return (
      <div style={{ width: "100%", height: "100%", background: "linear-gradient(170deg, #FFF7ED 0%, #FEF3C7 100%)", fontFamily: TB.fontBody, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 10 }}>
        <H as="h2" style={{ color: TB.text2, fontSize: 20 }}>{t("noRaceActive")}</H>
      </div>
    );
  }

  const r = apiRace;

  return (
    <div style={{ width: "100%", height: "100%", background: "linear-gradient(170deg, #FFF7ED 0%, #FEF3C7 100%)", fontFamily: TB.fontBody, padding: 20, boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 48, height: 48, borderRadius: "50%", background: TB.warning, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon name="flag" size={26} color="#fff" />
        </div>
        <div style={{ flex: 1 }}>
          <H as="h1" style={{ fontFamily: TB.fontDisplay, fontSize: 28 }}>{r.name}</H>
          <div style={{ fontSize: 12, color: TB.text2 }}>{t("firstToFinish")}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontFamily: TB.fontMono, fontSize: 26, fontWeight: 600, color: TB.destructive }}>6:50</div>
          <div style={{ fontSize: 10, color: TB.text2 }}>{t("timeLeft")}</div>
        </div>
      </div>

      {/* Tracks */}
      <div style={{ background: TB.surface, borderRadius: 16, padding: 18, display: "flex", flexDirection: "column", gap: 18 }}>
        {r.participants.map((p) => {
          const m = memberById.get(p.id);
          const pct = (p.progress / p.items) * 100;
          const participantName = m?.name ?? p.id;
          return (
            <div key={p.id}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                {m && <Avatar member={m} size={32} />}
                <div style={{ fontWeight: 600 }}>{participantName}</div>
                <div style={{ fontSize: 12, color: TB.text2, fontFamily: TB.fontMono, marginLeft: "auto" }}>
                  {p.progress}/{p.items}
                </div>
              </div>
              <div style={{ height: 22, background: TB.bg2, borderRadius: 9999, overflow: "hidden", position: "relative" }}>
                <div style={{ position: "absolute", inset: 0, display: "flex" }}>
                  {Array.from({ length: p.items }).map((_, i) => (
                    <div
                      key={i}
                      style={{
                        flex: 1,
                        borderRight: i < p.items - 1 ? `1px solid ${TB.surface}` : "none",
                        background: i < p.progress ? m?.color ?? TB.primary : "transparent",
                      }}
                    />
                  ))}
                </div>
                <div
                  style={{
                    position: "absolute",
                    top: 2,
                    left: `calc(${pct}% - 12px)`,
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    background: "#fff",
                    border: `2px solid ${m?.color ?? TB.primary}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 11,
                  }}
                >
                  🏃
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Checklist */}
      <div style={{ flex: 1, overflow: "auto" }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: TB.text2, margin: "6px 4px 8px", letterSpacing: "0.06em" }}>{t("tasksTapToClaim")}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {r.items.map((it, i) => {
            const m = it.by ? memberById.get(it.by) ?? null : null;
            return (
              <div
                key={i}
                style={{
                  padding: "12px 14px",
                  background: TB.surface,
                  borderRadius: 12,
                  border: m ? `1px solid ${m.color}40` : `1px solid ${TB.border}`,
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  opacity: m ? 0.7 : 1,
                }}
              >
                <div
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    border: `2px solid ${m ? m.color : TB.border}`,
                    background: m ? m.color : "transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {m && <Icon name="check" size={13} color="#fff" stroke={3} />}
                </div>
                <div style={{ flex: 1, fontSize: 15, fontWeight: 550, textDecoration: m ? "line-through" : "none" }}>
                  {it.name}
                </div>
                {m && <Avatar member={m} size={24} ring={false} />}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

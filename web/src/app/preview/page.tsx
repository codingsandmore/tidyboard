import Link from "next/link";
import { TB } from "@/lib/tokens";

type ScreenLink = { href: string; label: string };
type Section = { id: string; title: string; subtitle: string; links: ScreenLink[] };

const SECTIONS: Section[] = [
  {
    id: "real",
    title: "Real app entry points",
    subtitle: "The actual application, unframed",
    links: [
      { href: "/", label: "/ · Adaptive dashboard" },
      { href: "/onboarding", label: "/onboarding · Stateful wizard" },
      { href: "/calendar", label: "/calendar · Tabbed calendar" },
      { href: "/routines", label: "/routines · Interactive kid routine" },
      { href: "/recipes", label: "/recipes · Recipe library" },
      { href: "/meals", label: "/meals · Weekly meal plan" },
      { href: "/shopping", label: "/shopping · Stateful shopping list" },
      { href: "/equity", label: "/equity · Household balance" },
      { href: "/settings", label: "/settings" },
      { href: "/race", label: "/race · Kitchen clean-up race" },
      { href: "/lock", label: "/lock · Kiosk lock + member picker flow" },
    ],
  },
  {
    id: "onboarding",
    title: "Onboarding · 7 individual screens",
    subtitle: "Device-framed, per-step preview",
    links: [
      { href: "/onboarding/0", label: "Welcome" },
      { href: "/onboarding/1", label: "Create account" },
      { href: "/onboarding/2", label: "Household name" },
      { href: "/onboarding/3", label: "Add self" },
      { href: "/onboarding/4", label: "Add family" },
      { href: "/onboarding/5", label: "Connect calendar" },
      { href: "/onboarding/6", label: "All set!" },
    ],
  },
  {
    id: "dashboards",
    title: "Dashboards · 6 variations",
    subtitle: "iPhone · iPad portrait · MacBook · 3 kiosk variants",
    links: [
      { href: "/dashboard/phone", label: "Phone · primary home" },
      { href: "/dashboard/kiosk", label: "Kiosk V1 · Timeline" },
      { href: "/dashboard/kiosk-columns", label: "Kiosk V2 · Columns" },
      { href: "/dashboard/kiosk-ambient", label: "Kiosk V3 · Ambient tiles" },
      { href: "/dashboard/desktop", label: "Desktop · 3-column" },
      { href: "/dashboard/kiosk-dark", label: "Kiosk · dark mode" },
    ],
  },
  {
    id: "calendar",
    title: "Calendar · 6 variations",
    subtitle: "Day · week · month · agenda · event detail · dark",
    links: [
      { href: "/calendar/day", label: "Day · column per member" },
      { href: "/calendar/week", label: "Week" },
      { href: "/calendar/month", label: "Month" },
      { href: "/calendar/agenda", label: "Agenda · searchable" },
      { href: "/calendar/event", label: "Event modal · slide-up" },
      { href: "/calendar/day-dark", label: "Day · dark mode" },
    ],
  },
  {
    id: "routines",
    title: "Routines · 3 variations + lock",
    subtitle: "Kid-facing checklists plus kiosk lock flow",
    links: [
      { href: "/routines/kid", label: "V1 · Hero card (primary)" },
      { href: "/routines/checklist", label: "V2 · Color-flood checklist" },
      { href: "/routines/path", label: "V3 · Journey path" },
      { href: "/routines/kid-dark", label: "Kid · dark mode" },
      { href: "/lock/screen", label: "Kiosk lock · clock" },
      { href: "/lock/members", label: "Kiosk lock · member picker" },
    ],
  },
  {
    id: "recipes",
    title: "Recipes · meal plan · shopping",
    subtitle: "Import · preview · detail · weekly grid · list",
    links: [
      { href: "/recipes/preview-import", label: "Recipe · import URL" },
      { href: "/recipes/preview-preview", label: "Recipe · review & save" },
      { href: "/recipes/preview-detail", label: "Recipe · detail" },
      { href: "/recipes/preview-detail-dark", label: "Recipe · detail dark" },
      { href: "/meals/preview", label: "Meal plan · weekly grid" },
      { href: "/shopping/preview", label: "Shopping list" },
    ],
  },
  {
    id: "equity",
    title: "Equity · settings · race",
    subtitle: "Adult tools · household balance · gamification",
    links: [
      { href: "/equity/preview", label: "Equity V1 · full dashboard" },
      { href: "/equity/preview-dark", label: "Equity · dark mode" },
      { href: "/equity/preview-scales", label: "Equity V2 · scales metaphor" },
      { href: "/settings/preview", label: "Settings" },
      { href: "/race/preview", label: "Race view · mid-race" },
    ],
  },
];

export default function Preview() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f0eee9",
        padding: "60px 40px 80px",
        fontFamily: TB.fontBody,
        color: TB.text,
      }}
    >
      <header style={{ marginBottom: 48, maxWidth: 820 }}>
        <div
          style={{
            fontFamily: TB.fontDisplay,
            fontSize: 48,
            fontWeight: 600,
            letterSpacing: "-0.02em",
            color: TB.primary,
            lineHeight: 1,
          }}
        >
          tidyboard · preview
        </div>
        <div style={{ marginTop: 10, fontSize: 16, color: TB.text2 }}>
          Device-framed gallery of every screen. For the real app,{" "}
          <Link href="/" style={{ color: TB.primary, fontWeight: 600 }}>
            open the dashboard at /
          </Link>
          .
        </div>
      </header>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 24,
          maxWidth: 1200,
        }}
      >
        {SECTIONS.map((sec) => (
          <section
            key={sec.id}
            style={{
              background: TB.surface,
              border: `1px solid ${TB.border}`,
              borderRadius: 16,
              padding: 22,
              boxShadow: "0 1px 3px rgba(0,0,0,.04)",
            }}
          >
            <h2
              style={{
                fontFamily: TB.fontDisplay,
                fontSize: 22,
                fontWeight: 600,
                letterSpacing: "-0.015em",
                margin: 0,
                color: TB.text,
              }}
            >
              {sec.title}
            </h2>
            <div
              style={{ fontSize: 13, color: TB.text2, marginTop: 4, marginBottom: 14 }}
            >
              {sec.subtitle}
            </div>
            <ul
              style={{
                listStyle: "none",
                padding: 0,
                margin: 0,
                display: "grid",
                gap: 2,
              }}
            >
              {sec.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="tb-link"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                      padding: "10px 12px",
                      borderRadius: 8,
                      fontSize: 14,
                      fontWeight: 500,
                      color: TB.text,
                      textDecoration: "none",
                    }}
                  >
                    <span>{link.label}</span>
                    <span style={{ color: TB.muted, fontSize: 14 }}>→</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <style>{`.tb-link:hover { background: ${TB.bg2} !important; }`}</style>
    </div>
  );
}

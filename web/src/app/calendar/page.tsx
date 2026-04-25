"use client";

import { useState } from "react";
import { TB } from "@/lib/tokens";
import { CalAgenda, CalDay, CalMonth, CalWeek, EventModal } from "@/components/screens/calendar";
import type { EventFormData } from "@/components/screens/calendar";
import { useTheme } from "@/components/theme-provider";
import { useTranslations } from "next-intl";

type View = "Day" | "Week" | "Month" | "Agenda";

export default function CalendarPage() {
  const [view, setView] = useState<View>("Day");
  const [modalEvent, setModalEvent] = useState<EventFormData | null>(null);
  const { theme } = useTheme();
  const t = useTranslations("calendar");
  const tCommon = useTranslations("common");
  const dark = theme === "dark";

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        background: dark ? TB.dBg : TB.bg,
      }}
    >
      {/* View switcher bar — lets you choose which calendar view fills the
          viewport. The screens themselves contain their own internal tabs,
          but those tabs are static in the source design. */}
      <div
        style={{
          padding: "8px 16px",
          background: dark ? TB.dElevated : TB.surface,
          borderBottom: `1px solid ${dark ? TB.dBorder : TB.border}`,
          display: "flex",
          alignItems: "center",
          gap: 10,
          fontFamily: TB.fontBody,
          fontSize: 13,
        }}
      >
        <a
          href="/"
          style={{
            color: dark ? TB.dText2 : TB.text2,
            textDecoration: "none",
            padding: "6px 10px",
            borderRadius: 6,
            border: `1px solid ${dark ? TB.dBorder : TB.border}`,
          }}
        >
          {tCommon("home")}
        </a>
        <div style={{ flex: 1 }} />
        <div
          style={{
            display: "inline-flex",
            padding: 3,
            background: dark ? TB.dBg2 : TB.bg2,
            borderRadius: 8,
            gap: 2,
          }}
        >
          {(["Day", "Week", "Month", "Agenda"] as View[]).map((v) => {
            const viewLabelMap: Record<View, string> = {
              Day: t("views.day"),
              Week: t("views.week"),
              Month: t("views.month"),
              Agenda: t("views.agenda"),
            };
            return (
            <button
              key={v}
              onClick={() => setView(v)}
              style={{
                padding: "6px 12px",
                borderRadius: 6,
                fontSize: 12,
                fontWeight: view === v ? 600 : 500,
                background: view === v ? (dark ? TB.dElevated : TB.surface) : "transparent",
                color: view === v ? (dark ? TB.dText : TB.text) : (dark ? TB.dText2 : TB.text2),
                cursor: "pointer",
                border: "none",
                boxShadow: view === v ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                fontFamily: TB.fontBody,
              }}
            >
              {viewLabelMap[v]}
            </button>
            );
          })}
        </div>
        <button
          onClick={() => setModalEvent({})}
          style={{
            padding: "6px 12px",
            borderRadius: 6,
            border: `1px solid ${TB.primary}`,
            background: TB.primary,
            color: "#fff",
            cursor: "pointer",
            fontFamily: TB.fontBody,
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          {tCommon("event")}
        </button>
      </div>

      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        {view === "Day" && <CalDay dark={dark} />}
        {view === "Week" && <CalWeek />}
        {view === "Month" && <CalMonth />}
        {view === "Agenda" && <CalAgenda />}
        {modalEvent !== null && (
          <div
            onClick={(e) => {
              if (e.target === e.currentTarget) setModalEvent(null);
            }}
            style={{ position: "absolute", inset: 0 }}
          >
            <EventModal event={modalEvent} onClose={() => setModalEvent(null)} />
          </div>
        )}
      </div>
    </div>
  );
}

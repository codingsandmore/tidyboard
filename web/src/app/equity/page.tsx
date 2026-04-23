"use client";

import { useState } from "react";
import { TB } from "@/lib/tokens";
import { Equity, EquityScales } from "@/components/screens/equity";
import { useTheme } from "@/components/theme-provider";

type View = "Equity" | "Scales";

export default function EquityPage() {
  const [view, setView] = useState<View>("Equity");
  const { theme } = useTheme();
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
          ← Home
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
          {(["Equity", "Scales"] as View[]).map((v) => (
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
              {v}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflow: "hidden" }}>
        {view === "Equity" && <Equity dark={dark} />}
        {view === "Scales" && <EquityScales />}
      </div>
    </div>
  );
}

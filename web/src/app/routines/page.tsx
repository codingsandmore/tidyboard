"use client";

import Link from "next/link";
import { TB } from "@/lib/tokens";
import { getMember } from "@/lib/data";
import { Avatar } from "@/components/ui/avatar";
import { RoutineKid } from "@/components/screens/routine";
import { useTheme } from "@/components/theme-provider";
import { useRoutines } from "@/lib/api/hooks";

export default function RoutinesPage() {
  const { data: routines } = useRoutines();
  const memberId = routines?.[0]?.member ?? "jackson";
  const member = getMember(memberId);
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
        background: dark ? TB.dBg : "#F7F9F3",
        fontFamily: TB.fontBody,
      }}
    >
      {/* Top bar */}
      <div
        style={{
          padding: "8px 16px",
          background: dark ? TB.dElevated : TB.surface,
          borderBottom: `1px solid ${dark ? TB.dBorder : TB.border}`,
          display: "flex",
          alignItems: "center",
          gap: 10,
          fontSize: 13,
          flexShrink: 0,
        }}
      >
        <Link
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
        </Link>
        <div style={{ flex: 1 }} />
        {member && <Avatar member={member} size={36} />}
      </div>

      {/* Body — RoutineKid fills remaining space */}
      <div style={{ flex: 1, overflow: "hidden" }}>
        <RoutineKid dark={dark} />
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import { TB } from "@/lib/tokens";
import { Race } from "@/components/screens/equity";

export const metadata: Metadata = {
  title: "Race",
  description: "Real-time chore race — compete with family members to finish tasks first.",
};

export default function RacePage() {
  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        background: TB.bg,
      }}
    >
      <div
        style={{
          padding: "8px 16px",
          background: TB.surface,
          borderBottom: `1px solid ${TB.border}`,
          display: "flex",
          alignItems: "center",
          fontFamily: TB.fontBody,
          fontSize: 13,
        }}
      >
        <a
          href="/"
          style={{
            color: TB.text2,
            textDecoration: "none",
            padding: "6px 10px",
            borderRadius: 6,
            border: `1px solid ${TB.border}`,
          }}
        >
          ← Home
        </a>
      </div>

      <div style={{ flex: 1, overflow: "hidden" }}>
        <Race />
      </div>
    </div>
  );
}

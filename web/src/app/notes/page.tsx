import type { Metadata } from "next";
import { TB } from "@/lib/tokens";
import { NotesBoard } from "@/components/screens/notes";

export const metadata: Metadata = {
  title: "Notes",
  description: "Family sticky-note board — pin reminders, lunch lists, and chore handoffs.",
};

export default function NotesPage() {
  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        background: TB.bg,
        fontFamily: TB.fontBody,
      }}
    >
      <div
        style={{
          padding: "8px 16px",
          background: TB.surface,
          borderBottom: `1px solid ${TB.border}`,
          display: "flex",
          alignItems: "center",
          gap: 10,
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
      <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
        <NotesBoard />
      </div>
    </div>
  );
}

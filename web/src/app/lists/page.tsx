import type { Metadata } from "next";
import { TB } from "@/lib/tokens";
import { ListsIndex } from "@/components/screens/lists";

export const metadata: Metadata = {
  title: "Lists",
  description: "Family to-do, chore, packing, and errand lists.",
};

export default function ListsPage() {
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
        <ListsIndex />
      </div>
    </div>
  );
}

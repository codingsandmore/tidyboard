import type { Metadata } from "next";
import Link from "next/link";
import { TB } from "@/lib/tokens";
import { RecipeImport } from "@/components/screens/recipes";

export const metadata: Metadata = {
  title: "Import Recipe",
  description: "Paste a URL to import a recipe from 630+ supported websites.",
};

export default function RecipeImportPage() {
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
      {/* Top bar */}
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
        <Link
          href="/recipes"
          style={{
            color: TB.text2,
            textDecoration: "none",
            padding: "6px 10px",
            borderRadius: 6,
            border: `1px solid ${TB.border}`,
          }}
        >
          ← Back
        </Link>
      </div>
      <div style={{ flex: 1, overflow: "hidden" }}>
        <RecipeImport />
      </div>
    </div>
  );
}

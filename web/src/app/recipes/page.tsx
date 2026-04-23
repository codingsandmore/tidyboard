import type { Metadata } from "next";
import Link from "next/link";
import { TB } from "@/lib/tokens";

export const metadata: Metadata = {
  title: "Recipes",
  description:
    "Your family recipe collection. Import from 630+ websites, scale servings, and enter cooking mode.",
};
import { TBD } from "@/lib/data";
import { H } from "@/components/ui/heading";
import { Icon } from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";

export default function RecipesPage() {
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
        <div style={{ flex: 1 }} />
        <Link
          href="/recipes/import"
          style={{
            padding: "6px 12px",
            borderRadius: 6,
            border: `1px solid ${TB.primary}`,
            background: TB.primary,
            color: "#fff",
            cursor: "pointer",
            fontSize: 12,
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          + Add recipe
        </Link>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflow: "auto", padding: 24 }}>
        <H as="h2" style={{ fontSize: 24, marginBottom: 16 }}>
          Recipes
        </H>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: 16,
          }}
        >
          {TBD.recipes.map((r) => (
            <Link
              key={r.id}
              href={`/recipes/${r.id}`}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <div
                style={{
                  background: TB.surface,
                  border: `1px solid ${TB.border}`,
                  borderRadius: TB.r.lg,
                  padding: 16,
                  cursor: "pointer",
                  transition: "box-shadow 0.15s",
                }}
              >
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 600,
                    color: TB.text,
                    marginBottom: 4,
                  }}
                >
                  {r.title}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: TB.text2,
                    fontFamily: TB.fontMono,
                    marginBottom: 10,
                    letterSpacing: "0.04em",
                  }}
                >
                  {r.source}
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    fontSize: 12,
                    color: TB.text2,
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <Icon name="clock" size={13} color={TB.text2} />
                    {r.total}m
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <Icon name="users" size={13} color={TB.text2} />
                    {r.serves}
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <Icon name="star" size={13} color={TB.warning} />
                    {r.rating}/5
                  </span>
                  <div style={{ flex: 1 }} />
                  {r.tag.slice(0, 2).map((t) => (
                    <Badge key={t}>#{t}</Badge>
                  ))}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

"use client";

import { use } from "react";
import { notFound } from "next/navigation";
import { TB } from "@/lib/tokens";
import { ListDetail } from "@/components/screens/lists";
import { useList } from "@/lib/api/hooks";

type Props = { params: Promise<{ id: string }> };

export default function ListDetailPage({ params }: Props) {
  const { id } = use(params);
  const { data: list, isLoading, error } = useList(id);

  if (isLoading) {
    return (
      <div
        style={{
          width: "100vw",
          height: "100vh",
          background: TB.bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: TB.fontBody,
        }}
      >
        <div style={{ color: TB.text2, fontSize: 14 }}>Loading…</div>
      </div>
    );
  }

  if (error || !list) {
    notFound();
    return null;
  }

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
          href="/lists"
          style={{
            color: TB.text2,
            textDecoration: "none",
            padding: "6px 10px",
            borderRadius: 6,
            border: `1px solid ${TB.border}`,
          }}
        >
          ← Lists
        </a>
      </div>
      <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
        <ListDetail list={list} />
      </div>
    </div>
  );
}

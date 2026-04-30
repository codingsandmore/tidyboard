"use client";
import { TB } from "@/lib/tokens";
import { AdHocAdmin } from "@/components/screens/ad-hoc-admin";

export default function Page() {
  return (
    <div style={{ width: "100vw", height: "100vh", overflow: "auto", background: TB.bg }}>
      <div style={{ padding: "8px 16px", background: TB.surface, borderBottom: `1px solid ${TB.border}` }}>
        <a href="/" style={{ color: TB.text2, textDecoration: "none", fontSize: 13 }}>← Home</a>
      </div>
      <AdHocAdmin />
    </div>
  );
}

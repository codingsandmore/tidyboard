"use client";
import { use } from "react";
import { TB } from "@/lib/tokens";
import { WalletDetail } from "@/components/screens/wallet-detail";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <div style={{ width: "100vw", height: "100vh", overflow: "auto", background: TB.bg }}>
      <div style={{ padding: "8px 16px", background: TB.surface, borderBottom: `1px solid ${TB.border}` }}>
        <a href="/admin/wallets" style={{ color: TB.text2, textDecoration: "none", fontSize: 13 }}>← Wallets</a>
      </div>
      <WalletDetail memberId={id} />
    </div>
  );
}

"use client";
import { TB } from "@/lib/tokens";
import { WalletKid } from "@/components/screens/wallet-kid";
import { useAuth } from "@/lib/auth/auth-store";

export default function WalletPage() {
  const { activeMember } = useAuth();
  if (!activeMember) return <div style={{ padding: 24, fontFamily: TB.fontBody }}>Sign in to view your wallet.</div>;
  return (
    <div style={{ width: "100vw", height: "100vh", overflow: "hidden", display: "flex", flexDirection: "column", background: TB.bg }}>
      <div style={{ padding: "8px 16px", background: TB.surface, borderBottom: `1px solid ${TB.border}` }}>
        <a href="/" style={{ color: TB.text2, textDecoration: "none", fontSize: 13 }}>← Home</a>
      </div>
      <div style={{ flex: 1, overflow: "hidden" }}>
        <WalletKid memberId={activeMember.id} />
      </div>
    </div>
  );
}

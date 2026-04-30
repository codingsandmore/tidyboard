"use client";
import { useState } from "react";
import { TB } from "@/lib/tokens";
import { WalletKid } from "@/components/screens/wallet-kid";
import { MemberContextRequired } from "@/components/member-context-required";
import { useAuth, type AuthMember } from "@/lib/auth/auth-store";

export default function WalletPage() {
  const { status, activeMember, member, setActiveMember } = useAuth();
  const [localMember, setLocalMember] = useState<AuthMember | null>(null);
  const selectedMember = localMember ?? activeMember ?? member;

  if (status === "unauthenticated") {
    return <div style={{ padding: 24, fontFamily: TB.fontBody }}>Sign in to view your wallet.</div>;
  }

  if (!selectedMember) {
    return (
      <MemberContextRequired
        title="Choose who is using Wallet"
        returnTo="/wallet"
        onAdultSelect={(nextMember) => {
          setActiveMember(nextMember);
          setLocalMember(nextMember);
        }}
      />
    );
  }

  return (
    <div style={{ width: "100vw", height: "100vh", overflow: "hidden", display: "flex", flexDirection: "column", background: TB.bg }}>
      <div style={{ padding: "8px 16px", background: TB.surface, borderBottom: `1px solid ${TB.border}` }}>
        <a href="/" style={{ color: TB.text2, textDecoration: "none", fontSize: 13 }}>← Home</a>
      </div>
      <div style={{ flex: 1, overflow: "hidden" }}>
        <WalletKid memberId={selectedMember.id} />
      </div>
    </div>
  );
}

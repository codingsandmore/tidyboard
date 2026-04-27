"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TB } from "@/lib/tokens";
import { Card } from "@/components/ui/card";
import { Btn } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { H } from "@/components/ui/heading";
import { MoneyDisplay } from "@/components/ui/money-display";
import { useMembers, useWallet, useCashOut } from "@/lib/api/hooks";

export function WalletsAdmin() {
  const { data: members = [] } = useMembers();
  const kids = members.filter((m) => m.role === "child");
  const router = useRouter();

  return (
    <div style={{ padding: 16, fontFamily: TB.fontBody, background: TB.bg, minHeight: "100%" }}>
      <H as="h2" style={{ fontSize: 22 }}>Kid wallets</H>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12, marginTop: 16 }}>
        {kids.map((m) => <KidWalletCard key={m.id} member={m} onOpen={() => router.push(`/admin/wallets/${m.id}`)} />)}
      </div>
    </div>
  );
}

function KidWalletCard({ member, onOpen }: { member: { id: string; name: string; color: string }; onOpen: () => void }) {
  const { data: wallet } = useWallet(member.id);
  const cashOut = useCashOut();
  const [amt, setAmt] = useState("");
  const [busy, setBusy] = useState(false);

  function handleCashOut() {
    const cents = Math.round(parseFloat(amt) * 100);
    if (!cents || cents <= 0) return;
    setBusy(true);
    cashOut.mutate(
      { memberId: member.id, amountCents: cents, method: "cash" },
      { onSettled: () => { setBusy(false); setAmt(""); } }
    );
  }

  return (
    <Card pad={14} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Avatar member={member as Parameters<typeof Avatar>[0]["member"]} size={36} ring={false} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{member.name}</div>
          <MoneyDisplay cents={wallet?.wallet.balance_cents ?? 0} color={member.color} size="lg" />
        </div>
      </div>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <span style={{ fontSize: 12, color: TB.text2 }}>$</span>
        <input
          type="number"
          step="0.01"
          min="0"
          value={amt}
          onChange={(e) => setAmt(e.target.value)}
          placeholder="amount"
          style={{ flex: 1, padding: "6px 8px", border: `1px solid ${TB.border}`, borderRadius: 6, fontSize: 13 }}
        />
        <Btn kind="secondary" size="sm" onClick={handleCashOut} disabled={busy || !amt}>Cash out</Btn>
      </div>
      <Btn kind="ghost" size="sm" onClick={onOpen}>View detail →</Btn>
    </Card>
  );
}

"use client";

import { TB } from "@/lib/tokens";
import { Card } from "@/components/ui/card";
import { H } from "@/components/ui/heading";
import { MoneyDisplay } from "@/components/ui/money-display";
import { useWallet, useMembers } from "@/lib/api/hooks";

export function WalletKid({ memberId, dark = false }: { memberId: string; dark?: boolean }) {
  const { data: wallet } = useWallet(memberId);
  const { data: members } = useMembers();
  const member = members?.find((m) => m.id === memberId);
  const color = member?.color ?? TB.primary;

  if (!wallet) {
    return <div style={{ padding: 24, fontFamily: TB.fontBody }}>Loading…</div>;
  }

  return (
    <div style={{ width: "100%", height: "100%", background: dark ? TB.dBg : TB.bg, fontFamily: TB.fontBody, padding: 24, boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 20, overflow: "auto" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 12, color: TB.text2, letterSpacing: "0.08em" }}>{member?.name ?? "WALLET"} · BALANCE</div>
        <div style={{ marginTop: 8 }}>
          <MoneyDisplay cents={wallet.wallet.balance_cents} color={color} size="xl" />
        </div>
      </div>

      <H as="h3" style={{ fontSize: 16, marginTop: 8 }}>Recent</H>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {wallet.transactions.map((tx) => (
          <Card key={tx.id} pad={12} style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{tx.reason || labelFor(tx.kind)}</div>
              <div style={{ fontSize: 11, color: TB.text2 }}>{relTime(tx.created_at)} · {labelFor(tx.kind)}</div>
            </div>
            <MoneyDisplay cents={tx.amount_cents} color={tx.amount_cents < 0 ? TB.destructive : color} size="md" />
          </Card>
        ))}
      </div>
    </div>
  );
}

function labelFor(kind: string): string {
  const m: Record<string, string> = {
    chore_payout: "Chore",
    streak_bonus: "Streak bonus",
    tip: "Tip",
    ad_hoc: "Bonus task",
    cash_out: "Cashed out",
    adjustment: "Adjustment",
  };
  return m[kind] ?? kind;
}

function relTime(iso: string): string {
  const sec = (Date.now() - new Date(iso).getTime()) / 1000;
  if (sec < 60) return "just now";
  if (sec < 3600) return `${Math.floor(sec/60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec/3600)}h ago`;
  return `${Math.floor(sec/86400)}d ago`;
}

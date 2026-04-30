"use client";

import { useState } from "react";
import { TB } from "@/lib/tokens";
import { Card } from "@/components/ui/card";
import { Btn } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { H } from "@/components/ui/heading";
import { MoneyDisplay } from "@/components/ui/money-display";
import {
  useMembers, useWallet, useTip, useCashOut, useAllowance, useUpsertAllowance,
  useAdHocTasks, useApproveAdHocTask, useDeclineAdHocTask,
} from "@/lib/api/hooks";

export function WalletDetail({ memberId }: { memberId: string }) {
  const { data: members = [] } = useMembers();
  const member = members.find((m) => m.id === memberId);
  const { data: wallet } = useWallet(memberId);
  const { data: allowances = [] } = useAllowance();
  const tip = useTip();
  const cashOut = useCashOut();
  const upsertAllowance = useUpsertAllowance();
  const allowance = allowances.find((a) => a.member_id === memberId)?.amount_cents ?? 0;
  const { data: pendingAdHocs = [] } = useAdHocTasks({ memberId, status: "pending" });
  const approve = useApproveAdHocTask();
  const decline = useDeclineAdHocTask();

  const [tipAmt, setTipAmt] = useState("");
  const [tipReason, setTipReason] = useState("");
  const [cashAmt, setCashAmt] = useState("");
  const [allowanceDraft, setAllowanceDraft] = useState((allowance / 100).toFixed(2));

  if (!member) return <div style={{ padding: 24, fontFamily: TB.fontBody }}>Member not found.</div>;

  function fireTip() {
    const cents = Math.round(parseFloat(tipAmt) * 100);
    if (!cents || cents <= 0 || !tipReason) return;
    tip.mutate({ memberId, amountCents: cents, reason: tipReason }, { onSuccess: () => { setTipAmt(""); setTipReason(""); } });
  }
  function fireCashOut() {
    const cents = Math.round(parseFloat(cashAmt) * 100);
    if (!cents || cents <= 0) return;
    cashOut.mutate({ memberId, amountCents: cents, method: "cash" }, { onSuccess: () => setCashAmt("") });
  }
  function saveAllowance() {
    const cents = Math.round(parseFloat(allowanceDraft) * 100);
    if (cents < 0 || isNaN(cents)) return;
    upsertAllowance.mutate({ memberId, amountCents: cents });
  }

  return (
    <div style={{ padding: 16, fontFamily: TB.fontBody, background: TB.bg, minHeight: "100%", overflow: "auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Avatar member={member} size={48} ring={false} />
        <div>
          <H as="h2" style={{ fontSize: 22 }}>{member.name}</H>
          <MoneyDisplay cents={wallet?.wallet.balance_cents ?? 0} color={member.color} size="xl" />
        </div>
      </div>

      <Card pad={14} style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
        <H as="h3" style={{ fontSize: 14 }}>Weekly allowance</H>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <span>$</span>
          <input type="number" step="0.01" value={allowanceDraft} onChange={(e) => setAllowanceDraft(e.target.value)} style={{ flex: 1, padding: "6px 8px", border: `1px solid ${TB.border}`, borderRadius: 6 }}/>
          <Btn kind="primary" size="sm" onClick={saveAllowance}>Save</Btn>
        </div>
      </Card>

      <Card pad={14} style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
        <H as="h3" style={{ fontSize: 14 }}>Send a tip</H>
        <input type="number" step="0.01" placeholder="amount" value={tipAmt} onChange={(e) => setTipAmt(e.target.value)} style={{ padding: "6px 8px", border: `1px solid ${TB.border}`, borderRadius: 6 }}/>
        <input type="text" placeholder="reason (e.g. helping w/ groceries)" value={tipReason} onChange={(e) => setTipReason(e.target.value)} style={{ padding: "6px 8px", border: `1px solid ${TB.border}`, borderRadius: 6 }}/>
        <Btn kind="primary" size="sm" onClick={fireTip} disabled={!tipAmt || !tipReason}>Send tip</Btn>
      </Card>

      <Card pad={14} style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
        <H as="h3" style={{ fontSize: 14 }}>Cash out</H>
        <input type="number" step="0.01" placeholder="amount" value={cashAmt} onChange={(e) => setCashAmt(e.target.value)} style={{ padding: "6px 8px", border: `1px solid ${TB.border}`, borderRadius: 6 }}/>
        <Btn kind="secondary" size="sm" onClick={fireCashOut} disabled={!cashAmt}>Mark as paid</Btn>
      </Card>

      {pendingAdHocs.length > 0 && (
        <Card pad={14} style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
          <H as="h3" style={{ fontSize: 14 }}>Pending bonus tasks</H>
          {pendingAdHocs.map((t) => (
            <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: 8, border: `1px solid ${TB.border}`, borderRadius: 6 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{t.name}</div>
                <MoneyDisplay cents={t.payout_cents} size="sm" />
              </div>
              <Btn kind="primary" size="sm" onClick={() => approve.mutate({ id: t.id })}>Approve</Btn>
              <Btn kind="ghost" size="sm" onClick={() => decline.mutate({ id: t.id, reason: "" })}>Decline</Btn>
            </div>
          ))}
        </Card>
      )}

      <H as="h3" style={{ fontSize: 16, marginTop: 16 }}>Ledger</H>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
        {(wallet?.transactions ?? []).map((tx) => (
          <Card key={tx.id} pad={10} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{tx.reason || tx.kind}</div>
              <div style={{ fontSize: 11, color: TB.text2 }}>{new Date(tx.created_at).toLocaleString()} · {tx.kind}</div>
            </div>
            <MoneyDisplay cents={tx.amount_cents} color={tx.amount_cents < 0 ? TB.destructive : member.color} size="md" />
          </Card>
        ))}
      </div>
    </div>
  );
}

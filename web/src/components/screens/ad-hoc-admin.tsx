"use client";

import { useState } from "react";
import { TB } from "@/lib/tokens";
import { Card } from "@/components/ui/card";
import { Btn } from "@/components/ui/button";
import { H } from "@/components/ui/heading";
import { MoneyDisplay } from "@/components/ui/money-display";
import {
  useMembers, useAdHocTasks, useCreateAdHocTask,
  useApproveAdHocTask, useDeclineAdHocTask,
} from "@/lib/api/hooks";

export function AdHocAdmin() {
  const { data: members = [] } = useMembers();
  const kids = members.filter((m) => m.role === "child");
  const { data: pending = [] } = useAdHocTasks({ status: "pending" });
  const { data: open = [] } = useAdHocTasks({ status: "open" });
  const create = useCreateAdHocTask();
  const approve = useApproveAdHocTask();
  const decline = useDeclineAdHocTask();

  const [memberId, setMemberId] = useState(kids[0]?.id ?? "");
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");

  function submit() {
    const cents = Math.round(parseFloat(amount) * 100);
    if (!name || !memberId || !cents) return;
    create.mutate(
      { member_id: memberId, name, payout_cents: cents, requires_approval: true },
      { onSuccess: () => { setName(""); setAmount(""); } }
    );
  }

  return (
    <div style={{ padding: 16, fontFamily: TB.fontBody, background: TB.bg, minHeight: "100%", overflow: "auto" }}>
      <H as="h2" style={{ fontSize: 22 }}>Bonus tasks</H>

      <Card pad={14} style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
        <H as="h3" style={{ fontSize: 14 }}>Quick assign</H>
        <select value={memberId} onChange={(e) => setMemberId(e.target.value)} style={{ padding: "6px 8px", border: `1px solid ${TB.border}`, borderRadius: 6 }}>
          {kids.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <input type="text" placeholder="Task name (e.g. clean pool filter)" value={name} onChange={(e) => setName(e.target.value)} style={{ padding: "6px 8px", border: `1px solid ${TB.border}`, borderRadius: 6 }}/>
        <input type="number" step="0.01" placeholder="amount" value={amount} onChange={(e) => setAmount(e.target.value)} style={{ padding: "6px 8px", border: `1px solid ${TB.border}`, borderRadius: 6 }}/>
        <Btn kind="primary" size="sm" onClick={submit} disabled={!name || !amount || !memberId}>Assign</Btn>
      </Card>

      {pending.length > 0 && (
        <>
          <H as="h3" style={{ fontSize: 16, marginTop: 16 }}>Awaiting approval</H>
          <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
            {pending.map((t) => {
              const owner = members.find((m) => m.id === t.member_id);
              return (
                <Card key={t.id} pad={10} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{t.name}</div>
                    <div style={{ fontSize: 11, color: TB.text2 }}>{owner?.name ?? "?"} · <MoneyDisplay cents={t.payout_cents} size="sm" /></div>
                  </div>
                  <Btn kind="primary" size="sm" onClick={() => approve.mutate({ id: t.id })}>Approve</Btn>
                  <Btn kind="ghost" size="sm" onClick={() => decline.mutate({ id: t.id, reason: "" })}>Decline</Btn>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {open.length > 0 && (
        <>
          <H as="h3" style={{ fontSize: 16, marginTop: 16 }}>Assigned (not yet completed)</H>
          <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
            {open.map((t) => {
              const owner = members.find((m) => m.id === t.member_id);
              return (
                <Card key={t.id} pad={10}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{t.name}</div>
                  <div style={{ fontSize: 11, color: TB.text2 }}>{owner?.name ?? "?"} · <MoneyDisplay cents={t.payout_cents} size="sm" /></div>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

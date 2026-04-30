"use client";

import { useState } from "react";
import { TB } from "@/lib/tokens";
import { Card } from "@/components/ui/card";
import { Btn } from "@/components/ui/button";
import { H } from "@/components/ui/heading";
import {
  useMembers, useChores, useCreateChore, useArchiveChore,
} from "@/lib/api/hooks";

const FREQUENCIES = [
  { value: "daily", label: "Daily (7×/week)" },
  { value: "weekdays", label: "Weekdays (5×/week)" },
  { value: "weekly", label: "Weekly" },
];

export function ChoresAdmin() {
  const { data: members = [] } = useMembers();
  const kids = members.filter((m) => m.role === "child");
  const { data: chores = [] } = useChores();
  const createChore = useCreateChore();
  const archive = useArchiveChore();

  const [showForm, setShowForm] = useState(false);
  const [memberId, setMemberId] = useState(kids[0]?.id ?? "");
  const [name, setName] = useState("");
  const [weight, setWeight] = useState(3);
  const [frequencyKind, setFrequencyKind] = useState("daily");
  const [autoApprove, setAutoApprove] = useState(true);

  function submit() {
    if (!name || !memberId) return;
    createChore.mutate(
      { member_id: memberId, name, weight, frequency_kind: frequencyKind, auto_approve: autoApprove },
      { onSuccess: () => { setName(""); setShowForm(false); } }
    );
  }

  return (
    <div style={{ padding: 16, fontFamily: TB.fontBody, background: TB.bg, minHeight: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <H as="h2" style={{ fontSize: 22 }}>Chores</H>
        <Btn kind="primary" size="sm" onClick={() => setShowForm((v) => !v)}>{showForm ? "Close" : "+ New chore"}</Btn>
      </div>

      {showForm && (
        <Card pad={14} style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
          <select value={memberId} onChange={(e) => setMemberId(e.target.value)} style={{ padding: "6px 8px", border: `1px solid ${TB.border}`, borderRadius: 6 }}>
            {kids.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <input type="text" placeholder="Chore name" value={name} onChange={(e) => setName(e.target.value)} style={{ padding: "6px 8px", border: `1px solid ${TB.border}`, borderRadius: 6 }}/>
          <div>
            <div style={{ fontSize: 12, color: TB.text2, marginBottom: 4 }}>Weight: {weight}</div>
            <input type="range" min={1} max={5} value={weight} onChange={(e) => setWeight(parseInt(e.target.value, 10))} style={{ width: "100%" }}/>
          </div>
          <select value={frequencyKind} onChange={(e) => setFrequencyKind(e.target.value)} style={{ padding: "6px 8px", border: `1px solid ${TB.border}`, borderRadius: 6 }}>
            {FREQUENCIES.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
          <label style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
            <input type="checkbox" checked={autoApprove} onChange={(e) => setAutoApprove(e.target.checked)}/>
            Auto-approve completions (kid taps → wallet credit immediately)
          </label>
          <Btn kind="primary" size="sm" onClick={submit} disabled={!name || !memberId}>Create</Btn>
        </Card>
      )}

      <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 6 }}>
        {chores.filter((c) => !c.archived_at).map((c) => {
          const owner = members.find((m) => m.id === c.member_id);
          return (
            <Card key={c.id} pad={10} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{c.name}</div>
                <div style={{ fontSize: 11, color: TB.text2 }}>{owner?.name ?? "?"} · weight {c.weight} · {c.frequency_kind}{c.auto_approve ? " · auto" : ""}</div>
              </div>
              <Btn kind="ghost" size="sm" onClick={() => archive.mutate({ id: c.id })}>Archive</Btn>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

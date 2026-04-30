"use client";

import { useState } from "react";
import { useMembers, usePointCategories, useBehaviors, useGrantPoints } from "@/lib/api/hooks";

export function QuickAward() {
  const members = useMembers();
  const cats = usePointCategories();
  const behaviors = useBehaviors();
  const grant = useGrantPoints();

  const kids = (members.data ?? []).filter(m => m.role === "child");

  const [memberId, setMemberId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [toast, setToast] = useState("");

  const filteredBehaviors = (behaviors.data ?? []).filter(b => !categoryId || b.category_id === categoryId);

  const award = async (b: { id: string; suggested_points: number; category_id: string; name: string }) => {
    if (!memberId) return;
    await grant.mutateAsync({ memberId, behavior_id: b.id, category_id: b.category_id, points: b.suggested_points, reason: b.name });
    setToast(`+${b.suggested_points} to ${kids.find(k => k.id === memberId)?.name ?? ""}`);
    setTimeout(() => setToast(""), 1500);
  };

  return (
    <section className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">Quick Award</h1>
      <div>
        <h2 className="text-sm uppercase text-zinc-500 mb-2">Who</h2>
        <div className="flex gap-2 flex-wrap">
          {kids.map(k => (
            <button key={k.id} onClick={() => setMemberId(k.id)} className={`rounded-2xl px-4 py-3 font-semibold border-2 ${memberId === k.id ? "border-zinc-900" : "border-zinc-200"}`} style={{ color: k.color ?? undefined }}>{k.name}</button>
          ))}
        </div>
      </div>

      {memberId && (
        <div>
          <h2 className="text-sm uppercase text-zinc-500 mb-2">Category</h2>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setCategoryId(null)} className={`rounded-full px-3 py-1 ${categoryId === null ? "bg-zinc-900 text-white" : "bg-zinc-100"}`}>All</button>
            {(cats.data ?? []).map(c => (
              <button key={c.id} onClick={() => setCategoryId(c.id)} className={`rounded-full px-3 py-1 ${categoryId === c.id ? "text-white" : ""}`} style={{ backgroundColor: categoryId === c.id ? c.color : "#f4f4f5" }}>{c.name}</button>
            ))}
          </div>
        </div>
      )}

      {memberId && (
        <div>
          <h2 className="text-sm uppercase text-zinc-500 mb-2">Behavior</h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {filteredBehaviors.map(b => (
              <li key={b.id}>
                <button onClick={() => award(b)} className="w-full rounded-2xl bg-white border border-zinc-200 p-4 text-left hover:bg-zinc-50">
                  <div className="flex items-baseline justify-between">
                    <span className="font-semibold">{b.name}</span>
                    <span className="text-emerald-600 font-bold">+{b.suggested_points}</span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {toast && <div role="status" className="fixed bottom-4 left-1/2 -translate-x-1/2 rounded-xl bg-emerald-600 text-white px-4 py-2 shadow-lg">{toast}</div>}
    </section>
  );
}

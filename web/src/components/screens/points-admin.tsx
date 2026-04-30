"use client";

import { useState } from "react";
import {
  usePointCategories, useCreatePointCategory, useUpdatePointCategory, useArchivePointCategory,
  useBehaviors, useCreateBehavior, useUpdateBehavior, useArchiveBehavior,
} from "@/lib/api/hooks";

type Tab = "categories" | "behaviors";

export function PointsAdmin() {
  const [tab, setTab] = useState<Tab>("categories");
  return (
    <section className="p-4">
      <h1 className="text-2xl font-bold mb-4">Points Admin</h1>
      <nav className="flex gap-2 mb-4">
        <button onClick={() => setTab("categories")} className={`rounded-full px-4 py-1 ${tab === "categories" ? "bg-zinc-900 text-white" : "bg-zinc-100"}`}>Categories</button>
        <button onClick={() => setTab("behaviors")}  className={`rounded-full px-4 py-1 ${tab === "behaviors"  ? "bg-zinc-900 text-white" : "bg-zinc-100"}`}>Behaviors</button>
      </nav>
      {tab === "categories" ? <CategoriesPanel /> : <BehaviorsPanel />}
    </section>
  );
}

function CategoriesPanel() {
  const list = usePointCategories();
  const create = useCreatePointCategory();
  const update = useUpdatePointCategory();
  const archive = useArchivePointCategory();
  const [name, setName] = useState("");
  const [color, setColor] = useState("#10b981");

  return (
    <div className="space-y-3">
      <form onSubmit={(e) => { e.preventDefault(); if (name) { create.mutate({ name, color }); setName(""); } }} className="flex gap-2 items-end">
        <label className="flex-1"><span className="block text-xs text-zinc-500 mb-1">Name</span><input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-xl border border-zinc-300 px-3 py-2" /></label>
        <label><span className="block text-xs text-zinc-500 mb-1">Color</span><input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-10 w-12 rounded-xl border border-zinc-300" /></label>
        <button type="submit" className="rounded-xl bg-emerald-600 text-white px-4 py-2 font-semibold">Add</button>
      </form>
      <ul className="divide-y divide-zinc-200 rounded-2xl border border-zinc-200 bg-white">
        {(list.data ?? []).map(c => (
          <li key={c.id} className="flex items-center gap-3 p-3">
            <span className="h-4 w-4 rounded-full" style={{ backgroundColor: c.color }} />
            <input defaultValue={c.name} onBlur={(e) => e.target.value !== c.name && update.mutate({ id: c.id, name: e.target.value })} className="flex-1 bg-transparent" />
            <button onClick={() => archive.mutate({ id: c.id })} className="text-sm text-rose-600 hover:underline">Archive</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function BehaviorsPanel() {
  const cats = usePointCategories();
  const list = useBehaviors();
  const create = useCreateBehavior();
  const update = useUpdateBehavior();
  const archive = useArchiveBehavior();
  const [categoryId, setCategoryId] = useState<string>("");
  const [name, setName] = useState("");
  const [pts, setPts] = useState(1);

  return (
    <div className="space-y-3">
      <form onSubmit={(e) => { e.preventDefault(); if (categoryId && name) { create.mutate({ category_id: categoryId, name, suggested_points: pts }); setName(""); } }} className="flex gap-2 items-end flex-wrap">
        <label className="flex-1 min-w-[200px]"><span className="block text-xs text-zinc-500 mb-1">Behavior</span><input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-xl border border-zinc-300 px-3 py-2" /></label>
        <label><span className="block text-xs text-zinc-500 mb-1">Category</span><select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="rounded-xl border border-zinc-300 px-3 py-2"><option value="">—</option>{(cats.data ?? []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <label><span className="block text-xs text-zinc-500 mb-1">Points</span><input type="number" min={0} value={pts} onChange={(e) => setPts(Number(e.target.value))} className="w-20 rounded-xl border border-zinc-300 px-3 py-2" /></label>
        <button type="submit" className="rounded-xl bg-emerald-600 text-white px-4 py-2 font-semibold">Add</button>
      </form>
      <ul className="divide-y divide-zinc-200 rounded-2xl border border-zinc-200 bg-white">
        {(list.data ?? []).map(b => (
          <li key={b.id} className="grid grid-cols-[1fr_auto_auto_auto] gap-3 p-3 items-center">
            <input defaultValue={b.name} onBlur={(e) => e.target.value !== b.name && update.mutate({ id: b.id, name: e.target.value })} className="bg-transparent" />
            <span className="text-sm text-zinc-500">{(cats.data ?? []).find(c => c.id === b.category_id)?.name ?? "—"}</span>
            <input type="number" defaultValue={b.suggested_points} onBlur={(e) => Number(e.target.value) !== b.suggested_points && update.mutate({ id: b.id, suggested_points: Number(e.target.value) })} className="w-16 text-right" />
            <button onClick={() => archive.mutate({ id: b.id })} className="text-sm text-rose-600 hover:underline">Archive</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

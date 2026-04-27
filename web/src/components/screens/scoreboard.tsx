"use client";

import { useMembers, useScoreboard, usePointCategories } from "@/lib/api/hooks";

export function Scoreboard() {
  const sb = useScoreboard();
  const members = useMembers();
  const cats = usePointCategories();
  const memberMap = new Map((members.data ?? []).map((m) => [m.id, m]));
  const catMap = new Map((cats.data ?? []).map((c) => [c.id, c]));
  const rows = sb.data ?? [];

  return (
    <section className="p-4">
      <h1 className="text-2xl font-bold text-zinc-900 mb-4">Scoreboard</h1>
      <ol className="space-y-3">
        {rows.map((row, i) => {
          const m = memberMap.get(row.member_id);
          const isFirst = i === 0;
          return (
            <li
              key={row.member_id}
              className="rounded-2xl bg-white border border-zinc-200 p-4 flex items-center gap-4"
            >
              <span
                className={`text-2xl font-bold w-10 text-center ${isFirst ? "text-amber-500" : "text-zinc-400"}`}
              >
                {isFirst ? "👑" : `#${i + 1}`}
              </span>
              <div className="flex-1">
                <div className="flex items-baseline justify-between">
                  <span
                    className="font-semibold text-zinc-900"
                    style={{ color: m?.color ?? undefined }}
                  >
                    {m?.name ?? "—"}
                  </span>
                  <span className="text-xl font-bold">{row.total} pts</span>
                </div>
                <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {row.by_category
                    .filter((c) => c.category_id)
                    .map((c) => {
                      const cat = catMap.get(c.category_id!);
                      return (
                        <div key={c.category_id} className="text-xs">
                          <div className="flex items-baseline justify-between">
                            <span className="text-zinc-500">{cat?.name ?? "—"}</span>
                            <span className="font-medium">{c.total}</span>
                          </div>
                          <div className="mt-1 h-1.5 rounded-full bg-zinc-100 overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${row.total ? (Number(c.total) / Number(row.total)) * 100 : 0}%`,
                                backgroundColor: cat?.color ?? "#9ca3af",
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

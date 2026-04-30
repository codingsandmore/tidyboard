"use client";

import { useTimeline } from "@/lib/api/hooks";
import type { ApiTimelineEvent } from "@/lib/api/types";

const KIND_COLOR: Record<ApiTimelineEvent["kind"], string> = {
  point_grant: "border-emerald-500",
  redemption: "border-purple-500",
  reward_cost_adjustment: "border-orange-500",
  wallet_transaction: "border-amber-500",
};

const KIND_LABEL: Record<ApiTimelineEvent["kind"], string> = {
  point_grant: "Points",
  redemption: "Redemption",
  reward_cost_adjustment: "Cost adjustment",
  wallet_transaction: "Wallet",
};

function fmtAmount(e: ApiTimelineEvent): string {
  if (e.kind === "wallet_transaction") {
    const sign = e.amount >= 0 ? "+" : "-";
    return `${sign}$${(Math.abs(e.amount) / 100).toFixed(2)}`;
  }
  if (e.kind === "redemption") return `${e.amount} pts (${e.reason})`;
  const sign = e.amount > 0 ? "+" : "";
  return `${sign}${e.amount} pts`;
}

export interface TimelineProps {
  memberId: string;
}

export function Timeline({ memberId }: TimelineProps) {
  const { data: events = [], isLoading } = useTimeline(memberId);

  if (isLoading) return <p className="p-4 text-zinc-500">Loading…</p>;

  return (
    <section className="p-4">
      <h1 className="text-2xl font-bold text-zinc-900 mb-4">Timeline</h1>
      <ul className="space-y-2">
        {events.map((e) => (
          <li
            key={`${e.kind}-${e.id}`}
            className={`rounded-xl bg-white border-l-4 ${KIND_COLOR[e.kind]} border border-zinc-200 p-3`}
          >
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-medium text-zinc-700">{KIND_LABEL[e.kind]}</span>
              <span className="text-xs text-zinc-400">
                {new Date(e.occurred_at).toLocaleString()}
              </span>
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-zinc-900">{e.reason || "—"}</span>
              <span className="font-semibold">{fmtAmount(e)}</span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

"use client";

import { useState } from "react";
import {
  useRewards,
  useCreateReward,
  useUpdateReward,
  useArchiveReward,
  useRedemptions,
  useApproveRedemption,
  useDeclineRedemption,
  useFulfillRedemption,
  useMembers,
} from "@/lib/api/hooks";

export function RewardsAdmin() {
  const rewards = useRewards({ onlyActive: false });
  const create = useCreateReward();
  const update = useUpdateReward();
  const archive = useArchiveReward();
  const pending = useRedemptions({ status: "pending" });
  const approve = useApproveRedemption();
  const decline = useDeclineRedemption();
  const fulfill = useFulfillRedemption();
  const members = useMembers();
  const memberMap = new Map((members.data ?? []).map((m) => [m.id, m]));
  const rewardMap = new Map((rewards.data ?? []).map((r) => [r.id, r]));

  const [name, setName] = useState("");
  const [cost, setCost] = useState(50);
  const [kind, setKind] = useState<"self_serve" | "needs_approval">("needs_approval");

  return (
    <section className="p-4 space-y-6">
      <h1 className="text-2xl font-bold">Rewards Admin</h1>

      {(pending.data ?? []).length > 0 && (
        <section className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-4">
          <h2 className="font-semibold mb-2">
            Pending requests ({(pending.data ?? []).length})
          </h2>
          <ul className="space-y-2">
            {(pending.data ?? []).map((r) => (
              <li key={r.id} className="flex items-center gap-3 bg-white rounded-xl p-3">
                <div className="flex-1">
                  <div className="font-medium">
                    {memberMap.get(r.member_id)?.name ?? "—"} →{" "}
                    {rewardMap.get(r.reward_id)?.name ?? "—"}
                  </div>
                  <div className="text-sm text-zinc-500">{r.points_at_redemption} pts</div>
                </div>
                <button
                  onClick={() => approve.mutate({ id: r.id })}
                  className="rounded-xl bg-emerald-600 text-white px-3 py-1 font-semibold"
                >
                  Approve
                </button>
                <button
                  onClick={() => {
                    const reason = prompt("Reason for declining?") ?? "";
                    if (reason) decline.mutate({ id: r.id, reason });
                  }}
                  className="rounded-xl bg-rose-600 text-white px-3 py-1 font-semibold"
                >
                  Decline
                </button>
                <button
                  onClick={() => fulfill.mutate({ id: r.id })}
                  className="rounded-xl bg-zinc-200 text-zinc-700 px-3 py-1 font-semibold"
                >
                  Fulfill
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="font-semibold mb-2">Catalog</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (name && cost >= 0) {
              create.mutate({ name, cost_points: cost, fulfillment_kind: kind });
              setName("");
            }
          }}
          className="flex gap-2 items-end flex-wrap mb-3"
        >
          <label className="flex-1 min-w-[160px]">
            <span className="block text-xs text-zinc-500 mb-1">Name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-zinc-300 px-3 py-2"
            />
          </label>
          <label>
            <span className="block text-xs text-zinc-500 mb-1">Cost</span>
            <input
              type="number"
              min={0}
              value={cost}
              onChange={(e) => setCost(Number(e.target.value))}
              className="w-24 rounded-xl border border-zinc-300 px-3 py-2"
            />
          </label>
          <label>
            <span className="block text-xs text-zinc-500 mb-1">Fulfillment</span>
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as "self_serve" | "needs_approval")}
              className="rounded-xl border border-zinc-300 px-3 py-2"
            >
              <option value="needs_approval">Needs approval</option>
              <option value="self_serve">Self-serve</option>
            </select>
          </label>
          <button
            type="submit"
            className="rounded-xl bg-emerald-600 text-white px-4 py-2 font-semibold"
          >
            Add
          </button>
        </form>

        <ul className="divide-y divide-zinc-200 rounded-2xl border border-zinc-200 bg-white">
          {(rewards.data ?? []).map((r) => (
            <li key={r.id} className="grid grid-cols-[1fr_auto_auto_auto] gap-3 p-3 items-center">
              <input
                defaultValue={r.name}
                onBlur={(e) =>
                  e.target.value !== r.name &&
                  update.mutate({ id: r.id, name: e.target.value })
                }
                className="bg-transparent"
              />
              <span className="text-sm text-zinc-500">
                {r.fulfillment_kind === "self_serve" ? "self" : "approval"}
              </span>
              <input
                type="number"
                defaultValue={r.cost_points}
                onBlur={(e) =>
                  Number(e.target.value) !== r.cost_points &&
                  update.mutate({ id: r.id, cost_points: Number(e.target.value) })
                }
                className="w-20 text-right"
              />
              <button
                onClick={() => archive.mutate({ id: r.id })}
                className="text-sm text-rose-600 hover:underline"
              >
                Archive
              </button>
            </li>
          ))}
        </ul>
      </section>
    </section>
  );
}

"use client";

import { useMemo, useState } from "react";
import { useRewards, usePointsBalance, useRedeemReward, useSetSavingsGoal } from "@/lib/api/hooks";
import { RewardCard } from "@/components/ui/reward-card";
import { effectiveCost } from "@/lib/points/effective-cost";
import type { ApiReward } from "@/lib/api/types";

export interface RewardsKidProps { memberId: string; }

export function RewardsKid({ memberId }: RewardsKidProps) {
  const rewards = useRewards();
  const balance = usePointsBalance(memberId);
  const redeem = useRedeemReward();
  const setGoal = useSetSavingsGoal();
  const [activeGoal, setActiveGoal] = useState<string | null>(null);
  const [toast, setToast] = useState<string>("");

  const list = rewards.data ?? [];
  const total = balance.data?.total ?? 0;

  const cards = useMemo(() => list.map((r: ApiReward) => ({
    reward: r,
    cost: effectiveCost(r.cost_points, []),
  })), [list]);

  const onRedeem = async (rewardId: string) => {
    const res = await redeem.mutateAsync({ rewardId });
    setToast(res.status === "approved" ? `Redeemed! ${res.points_charged} pts spent.` : "Request sent — waiting for parent approval.");
    setTimeout(() => setToast(""), 3000);
  };

  const onSetGoal = async (rewardId: string) => {
    const next = activeGoal === rewardId ? null : rewardId;
    setActiveGoal(next);
    await setGoal.mutateAsync({ memberId, rewardId: next });
  };

  return (
    <section className="p-4">
      <header className="mb-4 flex items-baseline justify-between">
        <h1 className="text-2xl font-bold text-zinc-900">Rewards</h1>
        <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-800 font-semibold">{total} pts</span>
      </header>

      <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map(({ reward, cost }) => (
          <li key={reward.id}>
            <RewardCard reward={reward} effectiveCost={cost} balance={total} goalMode={activeGoal === reward.id} onRedeem={() => onRedeem(reward.id)} />
            <button onClick={() => onSetGoal(reward.id)} className="mt-2 w-full text-sm text-emerald-700 hover:underline">
              {activeGoal === reward.id ? "✓ Saving for this" : "Save for this"}
            </button>
          </li>
        ))}
      </ul>

      {toast && <div role="status" className="fixed bottom-4 left-1/2 -translate-x-1/2 rounded-xl bg-zinc-900 px-4 py-2 text-white shadow-lg">{toast}</div>}
    </section>
  );
}

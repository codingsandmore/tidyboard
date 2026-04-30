import type { ApiReward } from "@/lib/api/types";
import { cn } from "@/lib/utils";

export interface RewardCardProps {
  reward: ApiReward;
  effectiveCost: number;
  balance: number;
  goalMode?: boolean;
  onRedeem?: () => void;
  className?: string;
}

export function RewardCard({ reward, effectiveCost, balance, goalMode, onRedeem, className }: RewardCardProps) {
  const canAfford = balance >= effectiveCost;
  const short = effectiveCost - balance;
  const ctaLabel = canAfford
    ? reward.fulfillment_kind === "self_serve" ? "Redeem" : "Request"
    : `Need ${short} more`;
  const progress = Math.min(100, Math.round((balance / effectiveCost) * 100));

  return (
    <div className={cn("rounded-2xl bg-white shadow-sm border border-zinc-200 overflow-hidden flex flex-col", className)}>
      {reward.image_url && <img src={reward.image_url} alt="" className="w-full aspect-[4/3] object-cover" />}
      <div className="p-4 flex-1 flex flex-col">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="font-semibold text-zinc-900">{reward.name}</h3>
          <span className="text-sm font-medium text-zinc-500">{effectiveCost} pts</span>
        </div>
        {reward.description && <p className="mt-1 text-sm text-zinc-600 line-clamp-2">{reward.description}</p>}

        {goalMode && (
          <div className="mt-3">
            <div className="h-2 rounded-full bg-zinc-100 overflow-hidden">
              <div className="h-full bg-emerald-500 transition-all" style={{ width: `${progress}%` }} />
            </div>
            <div className="mt-1 text-xs text-zinc-500">{balance} / {effectiveCost}</div>
          </div>
        )}

        <button
          type="button"
          disabled={!canAfford}
          onClick={onRedeem}
          className={cn(
            "mt-4 w-full rounded-xl py-2 font-semibold text-white",
            canAfford ? "bg-emerald-600 hover:bg-emerald-500" : "bg-zinc-300 cursor-not-allowed"
          )}
        >
          {ctaLabel}
        </button>
      </div>
    </div>
  );
}

import { TB } from "@/lib/tokens";

export interface StreakIndicatorProps {
  count: number;
  max?: number;
  color?: string;
}

export function StreakIndicator({ count, max, color }: StreakIndicatorProps) {
  const hot = max !== undefined && count >= max && count > 0;
  return (
    <div
      data-hot={hot ? "true" : "false"}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "4px 10px",
        borderRadius: 9999,
        background: hot ? "#F97316" : (color ?? TB.muted) + "22",
        color: hot ? "#fff" : (color ?? TB.text2),
        fontSize: 13,
        fontWeight: 600,
        transition: "all .25s",
      }}
    >
      <span aria-hidden>🔥</span>
      <span>{count}</span>
    </div>
  );
}

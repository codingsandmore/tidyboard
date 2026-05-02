"use client";

import { TB } from "@/lib/tokens";
import { Icon } from "@/components/ui/icon";
import type { ApiReward } from "@/lib/api/types";
import { WidgetFrame, WidgetEmpty } from "./widget-frame";

/**
 * RewardsWidget — list of currently active rewards with point cost.
 * Surfaces the rewards catalog on /kiosk/tasks alongside chores so kids
 * see what they're working toward.
 */
export interface RewardsWidgetProps {
  rewards: ApiReward[];
  /** Max rewards rendered. */
  limit?: number;
  "data-testid"?: string;
}

export function RewardsWidget({
  rewards,
  limit = 6,
  ...rest
}: RewardsWidgetProps) {
  const testId = rest["data-testid"] ?? "kiosk-rewards";
  const active = rewards.filter((r) => r.active);
  const visible = active.slice(0, limit);
  const overflow = active.length - visible.length;

  return (
    <WidgetFrame
      data-testid={testId}
      eyebrow="Rewards"
      title={`Catalog (${active.length})`}
    >
      {active.length === 0 ? (
        <WidgetEmpty
          message="No active rewards"
          hint="Add rewards from the family settings."
          testId={`${testId}-empty`}
        />
      ) : (
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
            gap: 10,
          }}
        >
          {visible.map((reward) => (
            <li
              key={reward.id}
              data-testid={`kiosk-rewards-item-${reward.id}`}
              style={{
                background: TB.bg2,
                border: `1px solid ${TB.border}`,
                borderRadius: TB.r.lg,
                padding: 12,
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontFamily: TB.fontMono,
                  fontSize: 11,
                  color: TB.warning,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                <Icon name="star" size={12} color={TB.warning} />
                {reward.cost_points} pts
              </div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: TB.text,
                  lineHeight: 1.2,
                }}
              >
                {reward.name}
              </div>
              {reward.description && (
                <div
                  style={{
                    fontSize: 12,
                    color: TB.text2,
                    lineHeight: 1.3,
                    overflow: "hidden",
                    display: "-webkit-box",
                    WebkitBoxOrient: "vertical",
                    WebkitLineClamp: 2,
                  }}
                >
                  {reward.description}
                </div>
              )}
            </li>
          ))}
          {overflow > 0 && (
            <li
              data-testid="kiosk-rewards-overflow"
              style={{
                fontSize: 12,
                color: TB.text2,
                fontFamily: TB.fontMono,
                alignSelf: "center",
              }}
            >
              +{overflow} more
            </li>
          )}
        </ul>
      )}
    </WidgetFrame>
  );
}

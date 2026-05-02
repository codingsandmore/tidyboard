"use client";

import { TB } from "@/lib/tokens";
import { Icon } from "@/components/ui/icon";
import type { Shopping } from "@/lib/data";
import { WidgetFrame, WidgetEmpty } from "./widget-frame";

/**
 * ShoppingWidget — open shopping items snapshot for the kiosk meals page.
 * Data is read-only here; tap-through to /lists is left for a follow-up.
 */
export interface ShoppingWidgetProps {
  shopping?: Shopping;
  /** Max items to display before summarising. */
  limit?: number;
  "data-testid"?: string;
}

export function ShoppingWidget({
  shopping,
  limit = 8,
  ...rest
}: ShoppingWidgetProps) {
  const testId = rest["data-testid"] ?? "kiosk-shopping";
  if (!shopping) {
    return (
      <WidgetFrame data-testid={testId} eyebrow="Lists" title="Shopping">
        <WidgetEmpty
          message="No shopping list yet"
          hint="Generate a list from the meal plan."
          testId={`${testId}-empty`}
        />
      </WidgetFrame>
    );
  }
  const items = shopping.categories.flatMap((cat, catIdx) =>
    cat.items
      .filter((item) => !item.done)
      .map((item, itemIdx) => ({
        ...item,
        category: cat.name,
        key: item.id ?? `${cat.name}-${catIdx}-${itemIdx}-${item.name}`,
      }))
  );
  const total = items.length;
  const visible = items.slice(0, limit);
  const overflow = total - visible.length;

  return (
    <WidgetFrame
      data-testid={testId}
      eyebrow="Lists"
      title={`Shopping (${total} open)`}
    >
      {total === 0 ? (
        <WidgetEmpty
          message="Shopping list is clear"
          hint="Nothing to pick up right now."
          testId={`${testId}-clear`}
        />
      ) : (
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          {visible.map((item) => (
            <li
              key={item.key}
              data-testid={`kiosk-shopping-item-${item.key}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 10px",
                borderRadius: TB.r.md,
                background: TB.bg2,
              }}
            >
              <Icon name="checkCircle" size={16} color={TB.text2} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 14,
                    color: TB.text,
                    fontWeight: 500,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {item.name}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: TB.text2,
                    fontFamily: TB.fontMono,
                  }}
                >
                  {item.category}
                </div>
              </div>
              {typeof item.amt === "string" && item.amt.length > 0 && (
                <div
                  style={{
                    fontSize: 12,
                    color: TB.text2,
                    fontFamily: TB.fontMono,
                  }}
                >
                  {item.amt}
                </div>
              )}
            </li>
          ))}
          {overflow > 0 && (
            <li
              data-testid="kiosk-shopping-overflow"
              style={{
                fontSize: 12,
                color: TB.text2,
                fontFamily: TB.fontMono,
                paddingLeft: 10,
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

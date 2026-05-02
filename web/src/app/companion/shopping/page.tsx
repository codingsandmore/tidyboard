"use client";

/**
 * /companion/shopping — read-only shopping list for the Companion PWA (#89).
 *
 * Mobile-first view of the current shopping list, grouped by category, with
 * outstanding items first. Editing flows live on /shopping; this page is a
 * phone-friendly digest to glance at the list while out of the house.
 */

import { useMemo } from "react";
import { MobileShell } from "@/components/companion/MobileShell";
import { useShopping } from "@/lib/api/hooks";

export default function CompanionShoppingPage() {
  const { data: shopping } = useShopping();

  const { open, done } = useMemo(() => {
    const o: Array<{ id: string; name: string; amt: string; category: string }> = [];
    const d: Array<{ id: string; name: string; amt: string; category: string }> = [];
    let counter = 0;
    for (const cat of shopping?.categories ?? []) {
      for (const item of cat.items ?? []) {
        counter += 1;
        const stableId = item.id ?? `${cat.name}-${item.name}-${counter}`;
        const row = {
          id: stableId,
          name: item.name,
          amt: item.amt,
          category: cat.name,
        };
        if (item.done) d.push(row);
        else o.push(row);
      }
    }
    return { open: o, done: d };
  }, [shopping]);

  return (
    <MobileShell
      active="shopping"
      heading="Shopping"
      subheading={`${open.length} to buy`}
    >
      {open.length === 0 && done.length === 0 ? (
        <div data-testid="companion-shopping-empty" style={{ color: "#6b7280" }}>
          No items on the list.
        </div>
      ) : (
        <>
          <ul
            data-testid="companion-shopping-open"
            style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 }}
          >
            {open.map((item) => (
              <li
                key={item.id}
                data-testid={`companion-shopping-item-${item.id}`}
                style={{
                  padding: "12px 14px",
                  borderRadius: 10,
                  background: "#ffffff",
                  border: "1px solid #ececeb",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                }}
              >
                <span style={{ fontWeight: 600 }}>{item.name}</span>
                <span style={{ fontSize: 12, color: "#6b7280" }}>
                  {item.amt}
                  {item.category ? ` · ${item.category}` : ""}
                </span>
              </li>
            ))}
          </ul>
          {done.length > 0 ? (
            <details
              data-testid="companion-shopping-done"
              style={{ marginTop: 18 }}
            >
              <summary style={{ cursor: "pointer", color: "#6b7280", fontSize: 13 }}>
                {done.length} already in the cart
              </summary>
              <ul
                style={{
                  listStyle: "none",
                  margin: "10px 0 0",
                  padding: 0,
                  display: "grid",
                  gap: 6,
                  opacity: 0.6,
                }}
              >
                {done.map((item) => (
                  <li
                    key={item.id}
                    style={{
                      padding: "8px 12px",
                      borderRadius: 8,
                      background: "#f8f8f7",
                      textDecoration: "line-through",
                      fontSize: 14,
                    }}
                  >
                    {item.name}
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </>
      )}
    </MobileShell>
  );
}

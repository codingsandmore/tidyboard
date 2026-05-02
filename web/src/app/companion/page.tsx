"use client";

/**
 * /companion — Companion PWA home (issue #89).
 *
 * Mobile-first dashboard for adults to manage household state from their
 * phone. The home screen is a tiny snapshot: counts of upcoming events,
 * outstanding chores, and shopping items, with deep links to the three
 * read-only list views.
 *
 * The four /companion routes are:
 *   - /companion             — this file (home)
 *   - /companion/events      — upcoming events list
 *   - /companion/chores      — household chores list
 *   - /companion/shopping    — shopping list
 *
 * Pages here are intentionally read-only and reuse the existing API hooks
 * so we do not duplicate data-fetching logic.
 */

import Link from "next/link";
import { MobileShell } from "@/components/companion/MobileShell";
import { useEvents, useChores, useShopping } from "@/lib/api/hooks";

function shoppingOutstanding(
  shopping: ReturnType<typeof useShopping>["data"]
): number {
  if (!shopping?.categories) return 0;
  let n = 0;
  for (const cat of shopping.categories) {
    for (const item of cat.items ?? []) {
      if (!item.done) n += 1;
    }
  }
  return n;
}

const TILE_LINKS: Array<{
  href: string;
  label: string;
  testId: string;
  hint: string;
}> = [
  {
    href: "/companion/events",
    label: "Events",
    testId: "companion-home-tile-events",
    hint: "Calendar at a glance",
  },
  {
    href: "/companion/chores",
    label: "Chores",
    testId: "companion-home-tile-chores",
    hint: "Open household chores",
  },
  {
    href: "/companion/shopping",
    label: "Shopping",
    testId: "companion-home-tile-shopping",
    hint: "Items still to buy",
  },
];

export default function CompanionHomePage() {
  const { data: events } = useEvents();
  const { data: chores } = useChores();
  const { data: shopping } = useShopping();

  const eventCount = events?.length ?? 0;
  const choreCount = chores?.length ?? 0;
  const shoppingCount = shoppingOutstanding(shopping);

  const counts: Record<string, number> = {
    "/companion/events": eventCount,
    "/companion/chores": choreCount,
    "/companion/shopping": shoppingCount,
  };

  return (
    <MobileShell
      active="home"
      heading="Companion"
      subheading="Manage from your phone"
    >
      <section data-testid="companion-home" style={{ display: "grid", gap: 12 }}>
        {TILE_LINKS.map((tile) => (
          <Link
            key={tile.href}
            href={tile.href}
            data-testid={tile.testId}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "18px 18px",
              borderRadius: 14,
              background: "#ffffff",
              border: "1px solid #ececeb",
              textDecoration: "none",
              color: "#111827",
            }}
          >
            <div>
              <div style={{ fontSize: 17, fontWeight: 600 }}>{tile.label}</div>
              <div style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>
                {tile.hint}
              </div>
            </div>
            <div
              data-testid={`${tile.testId}-count`}
              aria-label={`${counts[tile.href] ?? 0} items`}
              style={{
                minWidth: 36,
                padding: "4px 10px",
                borderRadius: 999,
                background: "#f1f5f9",
                color: "#334155",
                textAlign: "center",
                fontWeight: 600,
                fontSize: 14,
              }}
            >
              {counts[tile.href] ?? 0}
            </div>
          </Link>
        ))}
      </section>

      <p
        style={{
          marginTop: 24,
          fontSize: 12,
          color: "#6b7280",
          textAlign: "center",
        }}
      >
        Read-only views. Editing flows ship in a follow-up issue.
      </p>
    </MobileShell>
  );
}

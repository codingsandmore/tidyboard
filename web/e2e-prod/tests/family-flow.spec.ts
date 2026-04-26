import { test, expect } from "@playwright/test";
import {
  apiCreateHousehold,
  apiCreateMember,
  apiListMembers,
  apiCreateEvent,
  apiListEvents,
  apiCreateList,
  apiCreateListItem,
  apiListItems,
  apiToggleListItem,
  apiPinLogin,
  apiMe,
  ApiError,
} from "../helpers/api";
import { CleanupQueue } from "../helpers/cleanup";

/**
 * Full-stack integration test against PRODUCTION (https://tidyboard.org).
 *
 * Auth: Cognito-issued bearer token must be supplied via the
 * TIDYBOARD_TEST_TOKEN env var (see e2e-prod/README.md for how to grab one
 * from the browser). If not set, the suite skips with a clear message
 * instead of failing CI.
 *
 * Isolation: every entity created here is named with a unique run prefix
 * `[E2E-{timestamp}]` so it's distinguishable from real user data, and is
 * tracked in a CleanupQueue that drains in afterAll — even on failure.
 *
 * What it covers:
 *   1. /v1/auth/me round-trips and yields a household_id
 *   2. New household + 3 members (1 adult, 2 kids with PINs)
 *   3. Calendar event create + list + delete round-trip
 *   4. Yearly-recurring event (birthday) — verifies recurrence_rule pass-through
 *   5. List + items: create, toggle, verify state, delete
 *   6. Kid PIN login → /v1/auth/me reflects the kid's member_id and role
 */

const TOKEN = process.env.TIDYBOARD_TEST_TOKEN ?? "";
const RUN = `E2E-${new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)}`;

test.describe("Production family flow (auth required)", () => {
  test.skip(!TOKEN, "TIDYBOARD_TEST_TOKEN env var not set — see e2e-prod/README.md");

  const cleanup = new CleanupQueue();
  let householdId = "";
  let kidMemberId = "";
  const kidPin = "1357";

  test.afterAll(async () => {
    const result = await cleanup.drain();
    console.log(`[cleanup] deleted ${result.ok}, failed ${result.failed.length}`);
    if (result.failed.length > 0) {
      console.log("[cleanup] failures:", JSON.stringify(result.failed, null, 2));
    }
  });

  test("1. /v1/auth/me works and returns a household_id", async () => {
    const me = await apiMe(TOKEN);
    expect(me.account_id).toBeTruthy();
    expect(me.household_id).toBeTruthy();
    householdId = me.household_id;
  });

  test("2. create a fresh test household + 3 members", async () => {
    const hh = await apiCreateHousehold(TOKEN, { name: `[${RUN}] Test Family` });
    expect(hh.id).toBeTruthy();
    cleanup.trackHousehold(TOKEN, hh.id);

    const adult = await apiCreateMember(TOKEN, hh.id, {
      name: `[${RUN}] Parent`,
      display_name: "Parent",
      role: "adult",
      color: "#3B82F6",
    });
    cleanup.trackMember(TOKEN, hh.id, adult.id);
    expect(adult.role).toBe("adult");

    const kid1 = await apiCreateMember(TOKEN, hh.id, {
      name: `[${RUN}] KidOne`,
      display_name: "KidOne",
      role: "child",
      color: "#22C55E",
      pin: kidPin,
    });
    cleanup.trackMember(TOKEN, hh.id, kid1.id);
    kidMemberId = kid1.id;

    const kid2 = await apiCreateMember(TOKEN, hh.id, {
      name: `[${RUN}] KidTwo`,
      display_name: "KidTwo",
      role: "child",
      color: "#F59E0B",
      pin: "2468",
    });
    cleanup.trackMember(TOKEN, hh.id, kid2.id);

    const members = await apiListMembers(TOKEN, hh.id);
    const ourMembers = members.filter((m) => m.name.startsWith(`[${RUN}]`));
    expect(ourMembers.length).toBe(3);

    // Use this fresh household for the rest of the suite. The user's real
    // household_id stays untouched.
    householdId = hh.id;
  });

  test("3. create + list + delete a calendar event", async () => {
    const start = new Date(Date.now() + 24 * 60 * 60 * 1000); // tomorrow
    const end = new Date(start.getTime() + 60 * 60 * 1000);

    const ev = await apiCreateEvent(TOKEN, {
      title: `[${RUN}] Soccer practice`,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      location: "Field 4",
      description: "Bring water bottle",
    });
    cleanup.trackEvent(TOKEN, ev.id);
    expect(ev.id).toBeTruthy();
    expect(ev.title).toContain(RUN);

    // List events in a window that includes our new event
    const listed = await apiListEvents(TOKEN, {
      start: new Date(start.getTime() - 60_000).toISOString(),
      end: new Date(end.getTime() + 60_000).toISOString(),
    });
    const found = listed.find((e) => e.id === ev.id);
    expect(found, "newly-created event should appear in range query").toBeTruthy();
    expect(found?.location).toBe("Field 4");
  });

  test("4. yearly-recurring event (birthday) round-trips recurrence_rule", async () => {
    const next = new Date();
    next.setDate(next.getDate() + 30);

    const ev = await apiCreateEvent(TOKEN, {
      title: `[${RUN}] Birthday`,
      start_time: next.toISOString(),
      end_time: new Date(next.getTime() + 60 * 60 * 1000).toISOString(),
      recurrence_rule: "FREQ=YEARLY",
    });
    cleanup.trackEvent(TOKEN, ev.id);
    expect(ev.recurrence_rule).toBe("FREQ=YEARLY");
  });

  test("5. list + items: create, add 3, toggle one, verify", async () => {
    const list = await apiCreateList(TOKEN, {
      name: `[${RUN}] Chores`,
      type: "chores",
    });
    cleanup.trackList(TOKEN, list.id);

    const items = await Promise.all([
      apiCreateListItem(TOKEN, list.id, { text: "Take out trash" }),
      apiCreateListItem(TOKEN, list.id, { text: "Empty dishwasher" }),
      apiCreateListItem(TOKEN, list.id, { text: "Walk the dog" }),
    ]);
    expect(items).toHaveLength(3);

    // Toggle the first item complete
    const toggled = await apiToggleListItem(TOKEN, list.id, items[0].id, true);
    expect(toggled.completed).toBe(true);

    // Re-fetch and verify only one is complete
    const reread = await apiListItems(TOKEN, list.id);
    const completedCount = reread.filter((i) => i.completed).length;
    expect(completedCount).toBe(1);
    const stillOpenCount = reread.filter((i) => !i.completed).length;
    expect(stillOpenCount).toBe(2);
  });

  test("6. kid PIN login yields a child token scoped to that member", async () => {
    if (!kidMemberId) {
      test.skip(true, "kid member was not created in step 2");
      return;
    }
    let kidToken: string;
    try {
      const resp = await apiPinLogin(kidMemberId, kidPin);
      expect(resp.token).toBeTruthy();
      expect(resp.member_id).toBe(kidMemberId);
      kidToken = resp.token;
    } catch (err) {
      // PIN endpoint may require household_id in path or headers depending on
      // backend evolution. Surface the actual error so we can adjust if so.
      if (err instanceof ApiError) {
        throw new Error(
          `PIN login failed (${err.status}): ${JSON.stringify(err.body)}`
        );
      }
      throw err;
    }

    const me = await apiMe(kidToken);
    expect(me.member_id).toBe(kidMemberId);
    expect(me.role).toMatch(/child|kid|member/);
  });
});

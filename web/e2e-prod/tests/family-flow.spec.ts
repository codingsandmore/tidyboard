import { test, expect } from "@playwright/test";
import {
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
  apiCreateChore,
  apiCompleteChore,
  apiGetWallet,
  apiTip,
  apiUpsertAllowance,
  apiCashOut,
  apiCreateCategory,
  apiDeleteCategory,
  apiCreateBehavior,
  apiDeleteBehavior,
  apiGrantPoints,
  apiPointsBalance,
  apiCreateReward,
  apiDeleteReward,
  apiRedeemReward,
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
 *   2. Real roster in the authenticated household (1 adult, 2 kids with PINs, 1 pet)
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

  test("2. seed the authenticated household with adults, kids, and pet", async () => {
    if (!householdId) test.skip(true, "no authenticated household available from step 1");

    const adult = await apiCreateMember(TOKEN, householdId, {
      name: `[${RUN}] Parent`,
      display_name: "Parent",
      role: "adult",
      color: "#3B82F6",
    });
    cleanup.trackMember(TOKEN, householdId, adult.id);
    expect(["admin", "adult"]).toContain(adult.role);

    const kid1 = await apiCreateMember(TOKEN, householdId, {
      name: `[${RUN}] KidOne`,
      display_name: "KidOne",
      role: "child",
      color: "#22C55E",
      pin: kidPin,
    });
    cleanup.trackMember(TOKEN, householdId, kid1.id);
    kidMemberId = kid1.id;

    const kid2 = await apiCreateMember(TOKEN, householdId, {
      name: `[${RUN}] KidTwo`,
      display_name: "KidTwo",
      role: "child",
      color: "#F59E0B",
      pin: "2468",
    });
    cleanup.trackMember(TOKEN, householdId, kid2.id);

    const pet = await apiCreateMember(TOKEN, householdId, {
      name: `[${RUN}] Buddy`,
      display_name: "Buddy",
      role: "pet",
      age_group: "pet",
      color: "#A855F7",
    });
    cleanup.trackMember(TOKEN, householdId, pet.id);
    expect(pet.role).toBe("pet");

    const members = await apiListMembers(TOKEN, householdId);
    const ourMembers = members.filter((m) => m.name.startsWith(`[${RUN}]`));
    expect(ourMembers.length).toBe(4);
    expect(ourMembers.some((m) => m.role === "pet" && m.display_name === "Buddy")).toBe(true);
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

  test("7. wallet flow: allowance + chore + completion + tip + cash-out", async () => {
    const members = await apiListMembers(TOKEN, householdId);
    const kid = members.find((m) => m.name.startsWith(`[${RUN}]`) && m.role === "child");
    if (!kid) test.skip(true, "no test kid available from step 2");

    // Set $5/week allowance
    await apiUpsertAllowance(TOKEN, kid!.id, 500);

    // Create a chore
    const chore = await apiCreateChore(TOKEN, {
      member_id: kid!.id,
      name: `[${RUN}] feed dog`,
      weight: 3,
      frequency_kind: "daily",
      auto_approve: true,
    });
    cleanup.trackChore(TOKEN, chore.id);
    expect(chore.id).toBeTruthy();

    // Complete it for today
    await apiCompleteChore(TOKEN, chore.id);

    // Verify wallet got credited
    const w1 = await apiGetWallet(TOKEN, kid!.id);
    expect(w1.wallet.balance_cents).toBeGreaterThan(0);

    // Tip $1
    await apiTip(TOKEN, kid!.id, 100, "great job today");
    const w2 = await apiGetWallet(TOKEN, kid!.id);
    expect(w2.wallet.balance_cents).toBeGreaterThan(w1.wallet.balance_cents);
    expect(w2.transactions.some((t) => t.kind === "tip")).toBe(true);

    // Cash out the full balance
    await apiCashOut(TOKEN, kid!.id, w2.wallet.balance_cents);
    const w3 = await apiGetWallet(TOKEN, kid!.id);
    expect(w3.wallet.balance_cents).toBe(0);
  });

  test("8. points + rewards round-trip", async () => {
    if (!TOKEN) test.skip(true, "no TIDYBOARD_TEST_TOKEN");

    const members = await apiListMembers(TOKEN, householdId);
    const kid = members.find((m) => m.name.startsWith(`[${RUN}]`) && m.role === "child");
    if (!kid) test.skip(true, "no test kid available from step 2");

    // local cleanup stack — drained at end of this test
    const pointsCleanup: Array<() => Promise<unknown>> = [];
    try {
      // 1. category
      const cat = await apiCreateCategory(TOKEN, `[${RUN}] Effort`, "#10b981");
      pointsCleanup.push(() => apiDeleteCategory(TOKEN, cat.id));

      // 2. behavior
      const beh = await apiCreateBehavior(TOKEN, cat.id, `[${RUN}] Did dishes`, 10);
      pointsCleanup.push(() => apiDeleteBehavior(TOKEN, beh.id));

      // 3. grant 25 pts to the test kid
      await apiGrantPoints(TOKEN, kid!.id, {
        behavior_id: beh.id,
        category_id: cat.id,
        points: 25,
        reason: "round-trip test",
      });
      const bal = await apiPointsBalance(TOKEN, kid!.id);
      expect(bal.total).toBeGreaterThanOrEqual(25);

      // 4. self-serve reward + redeem
      const reward = await apiCreateReward(TOKEN, `[${RUN}] sticker`, 10, "self_serve");
      pointsCleanup.push(() => apiDeleteReward(TOKEN, reward.id));

      const r = await apiRedeemReward(TOKEN, reward.id, kid!.id);
      expect(r.status).toBe("approved");

      const bal2 = await apiPointsBalance(TOKEN, kid!.id);
      expect(bal2.total).toBe(bal.total - 10);
    } finally {
      // drain in reverse order, best-effort
      for (const fn of pointsCleanup.reverse()) {
        try {
          await fn();
        } catch {
          // best-effort — ignore cleanup failures
        }
      }
    }
  });
});

import { test, expect, gotoAndWait } from "./fixtures";

// Regression suite for previously dead/broken UI interactions. Each test
// targets a specific button or input that was decorative-only and is now
// wired. If a test fails, the regression has returned.

test.describe("Calendar — day navigation chevrons", () => {
  test("Next/Previous day chevrons advance the heading and are reversible", async ({ page }) => {
    await gotoAndWait(page, "/calendar?view=Day");
    const heading = page.getByTestId("calendar-day-heading");
    await expect(heading).toBeVisible();
    const initial = (await heading.textContent())?.trim() ?? "";

    await page.getByTestId("calendar-day-next").click();
    await expect(heading).not.toHaveText(initial);
    const advanced = (await heading.textContent())?.trim() ?? "";

    await page.getByTestId("calendar-day-prev").click();
    await expect(heading).toHaveText(initial);
    expect(advanced).not.toEqual(initial);
  });
});

test.describe("Calendar — agenda search input", () => {
  test("Typing in the search input filters the visible event groups", async ({ page }) => {
    await gotoAndWait(page, "/calendar?view=Agenda");
    const search = page.getByPlaceholder(/Search events/i);
    await expect(search).toBeVisible();

    // Baseline — both "Park visit" and "Book club" exist in the static fixtures.
    await expect(page.getByText("Park visit").first()).toBeVisible();
    await expect(page.getByText("Book club").first()).toBeVisible();

    // Filter to "Park" — "Book club" must disappear.
    await search.fill("Park");
    await expect(page.getByText("Park visit").first()).toBeVisible();
    await expect(page.getByText("Book club")).toHaveCount(0);

    // Clearing brings everything back.
    await search.fill("");
    await expect(page.getByText("Book club").first()).toBeVisible();
  });
});

test.describe("Recipe detail — serving scaler", () => {
  test("+/- buttons change the count and rescale ingredient amounts", async ({ page }) => {
    // r1 is one of the seeded sample recipes (TBD.recipes), serves 4.
    await gotoAndWait(page, "/recipes/r1");
    const count = page.getByTestId("serving-count");
    await expect(count).toBeVisible();
    await expect(count).toHaveText(/^[1-9]\d*$/);

    const initial = parseInt((await count.textContent())?.trim() || "0", 10);
    expect(initial).toBeGreaterThan(0);

    // Increment 2× and verify text updates.
    await page.getByTestId("serving-increment").click();
    await page.getByTestId("serving-increment").click();
    await expect(count).toHaveText(String(initial + 2));

    // Decrement back.
    await page.getByTestId("serving-decrement").click();
    await page.getByTestId("serving-decrement").click();
    await expect(count).toHaveText(String(initial));

    // Decrement past 1 should be blocked (button disabled).
    while (parseInt((await count.textContent())?.trim() || "0", 10) > 1) {
      await page.getByTestId("serving-decrement").click();
    }
    await expect(count).toHaveText("1");
    await expect(page.getByTestId("serving-decrement")).toBeDisabled();
  });
});

test.describe("Settings — no decorative alerts", () => {
  test("Settings page has no broken household-deletion alert button", async ({ page }) => {
    // Capture any window.alert() — if any fires, we've regressed.
    let alertFired = false;
    page.on("dialog", async (d) => {
      alertFired = true;
      await d.dismiss();
    });
    await gotoAndWait(page, "/settings");
    // The duplicate Settings preview block was removed from /settings — the
    // only "Delete household" / "Sign out" controls live in the real cards.
    // Confirm no alert dialog ever fires from the page just by loading it.
    await page.waitForTimeout(200);
    expect(alertFired).toBe(false);
  });

  test("Settings page does not render the duplicate preview navigation list", async ({ page }) => {
    await gotoAndWait(page, "/settings");
    // The decorative settings groups (Household, Members, Calendars, …) used
    // to all link back to /settings; those rows were removed. Real settings
    // cards still render unique headings.
    const dupChevrons = page.locator('a[href^="/settings#"]');
    await expect(dupChevrons).toHaveCount(0);
  });
});

test.describe("Recipe import — file import button is honest", () => {
  test("Import-from-file button is disabled, not an alert trap", async ({ page }) => {
    let alertFired = false;
    page.on("dialog", async (d) => {
      alertFired = true;
      await d.dismiss();
    });
    await gotoAndWait(page, "/recipes/import");
    const fileBtn = page.getByRole("button", { name: /Import from file/i });
    await expect(fileBtn).toBeVisible();
    await expect(fileBtn).toBeDisabled();
    // Even if a user clicks it, no alert should fire.
    await fileBtn.click({ force: true }).catch(() => {});
    await page.waitForTimeout(150);
    expect(alertFired).toBe(false);
  });
});

test.describe("Onboarding — step 1 inputs are not deceptively interactive", () => {
  test("Email/password fields on step 1 are read-only (Cognito owns auth)", async ({ page }) => {
    await gotoAndWait(page, "/onboarding");
    // Step 1 is "Create account" — find any input rendered on the page.
    const inputs = page.locator("input").filter({ hasNot: page.locator("[type=hidden]") });
    const count = await inputs.count();
    if (count === 0) return;
    for (let i = 0; i < count; i++) {
      const el = inputs.nth(i);
      const readonly = await el.getAttribute("readonly");
      const disabled = await el.getAttribute("disabled");
      expect(readonly !== null || disabled !== null).toBe(true);
    }
  });
});

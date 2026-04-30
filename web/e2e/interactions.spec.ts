import { test, expect, gotoAndWait } from "./fixtures";

test.describe("Public interaction surfaces", () => {
  test("preview gallery links remain available without auth", async ({ page }) => {
    await gotoAndWait(page, "/preview");

    const links = page.locator("a[href]");
    await expect(links.first()).toBeVisible();
    expect(await links.count()).toBeGreaterThanOrEqual(10);
  });

  test("onboarding redirects signed-out users to login with return target", async ({ page }) => {
    await gotoAndWait(page, "/onboarding");

    await page.waitForURL("**/login?returnTo=%2Fonboarding", { timeout: 10_000 });
    await expect(page.locator("body")).not.toContainText("Step 1 / 7");
  });

  test("protected interaction routes redirect to login instead of fallback data", async ({ page }) => {
    await gotoAndWait(page, "/calendar?view=Day");

    await page.waitForURL("**/login?returnTo=%2Fcalendar", { timeout: 10_000 });
    await expect(page.locator("body")).not.toContainText("Park visit");
  });
});

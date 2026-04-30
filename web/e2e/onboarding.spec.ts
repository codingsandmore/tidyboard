import { test, expect, gotoAndWait } from "./fixtures";

test.describe("Onboarding auth boundary", () => {
  test("signed-out users must sign in before onboarding", async ({ page }) => {
    await gotoAndWait(page, "/onboarding");

    await page.waitForURL("**/login?returnTo=%2Fonboarding", { timeout: 10_000 });
    await expect(page.locator("body")).not.toContainText("Step 1 / 7");
  });
});

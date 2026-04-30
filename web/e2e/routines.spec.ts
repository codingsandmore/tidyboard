import { test, expect, gotoAndWait } from "./fixtures";

test.describe("Routines auth gate", () => {
  test("routines require a real signed-in household", async ({ page }) => {
    await gotoAndWait(page, "/routines");

    await page.waitForURL("**/login?returnTo=%2Froutines", { timeout: 10_000 });
    await expect(page.locator("body")).not.toContainText("You're on this one");
  });
});

import { test, expect, gotoAndWait } from "./fixtures";

test.describe("Calendar auth gate", () => {
  test("calendar no longer renders fallback events without a real session", async ({ page }) => {
    await gotoAndWait(page, "/calendar");

    await page.waitForURL("**/login?returnTo=%2Fcalendar", { timeout: 10_000 });
    await expect(page.locator("body")).not.toContainText("Dentist");
    await expect(page.locator("body")).not.toContainText("Park visit");
  });
});

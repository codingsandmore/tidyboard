import { test, expect, gotoAndWait } from "./fixtures";

test.describe("Rewards auth gate", () => {
  for (const path of ["/rewards", "/scoreboard", "/admin/rewards"]) {
    test(`${path} does not render fallback rewards while signed out`, async ({ page }) => {
      await gotoAndWait(page, path);

      await page.waitForURL(/\/login(?:\?returnTo=.*)?$/, { timeout: 10_000 });
      await expect(page.locator("body")).not.toContainText("Stickers");
      await expect(page.locator("body")).not.toContainText("47 pts");
    });
  }
});

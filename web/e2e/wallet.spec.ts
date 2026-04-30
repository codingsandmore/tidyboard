import { test, expect, gotoAndWait } from "./fixtures";

test.describe("Wallet and chores auth gate", () => {
  for (const path of ["/wallet", "/chores", "/admin/wallets", "/admin/chores", "/admin/ad-hoc"]) {
    test(`${path} requires a real signed-in household`, async ({ page }) => {
      await gotoAndWait(page, path);

      await page.waitForURL(/\/login(?:\?returnTo=.*)?$/, { timeout: 10_000 });
      await expect(page.locator("body")).not.toContainText("Brush teeth");
      await expect(page.locator("body")).not.toContainText("BALANCE");
      await expect(page.locator("body")).not.toContainText("Kid wallets");
    });
  }
});

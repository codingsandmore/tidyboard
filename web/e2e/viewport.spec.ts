import { test, expect } from "./fixtures";

test.describe("Viewport — protected dashboard boundary", () => {
  for (const size of [
    { width: 360, height: 800 },
    { width: 900, height: 1200 },
    { width: 1440, height: 900 },
  ]) {
    test(`${size.width}x${size.height} redirects to login without demo dashboard`, async ({ page }) => {
      await page.setViewportSize(size);
      await page.goto("/");
      await page.waitForLoadState("domcontentloaded");

      await page.waitForURL("**/login", { timeout: 10_000 });
      await expect(page.locator("body")).not.toContainText("The Smith Family");
      await expect(page.locator("body")).not.toContainText("10:34");
    });
  }
});

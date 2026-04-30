import { test, expect, gotoAndWait } from "./fixtures";

test.describe("Shopping auth gate", () => {
  test("shopping does not render fallback categories while signed out", async ({ page }) => {
    await gotoAndWait(page, "/shopping");

    await page.waitForURL("**/login?returnTo=%2Fshopping", { timeout: 10_000 });
    await expect(page.locator("body")).not.toContainText("Produce");
    await expect(page.locator("body")).not.toContainText("Pantry");
  });
});

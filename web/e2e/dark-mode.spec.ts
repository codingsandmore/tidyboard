import { test, expect, gotoAndWait } from "./fixtures";

test.describe("Settings preview surface", () => {
  test("settings preview remains a public design route", async ({ page }) => {
    await gotoAndWait(page, "/settings/preview");

    expect(page.url()).toContain("/settings/preview");
    const body = await page.locator("body").textContent();
    expect((body ?? "").length).toBeGreaterThan(10);
  });
});

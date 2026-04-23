import { test, expect, gotoAndWait } from "./fixtures";

test.describe("Dark mode via Settings", () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage to start fresh each time
    await page.goto("/settings");
    await page.evaluate(() => localStorage.removeItem("tb-theme"));
    await page.reload();
    await page.waitForLoadState("domcontentloaded");
  });

  test("clicking Dark adds html.dark class", async ({ page }) => {
    const darkBtn = page.locator("button", { hasText: "Dark" });
    await expect(darkBtn).toBeVisible();
    await darkBtn.click();

    // ThemeProvider adds "dark" class to <html>
    const htmlClass = await page.locator("html").getAttribute("class");
    expect(htmlClass).toContain("dark");
  });

  test("clicking Light removes html.dark class", async ({ page }) => {
    // First set dark
    const darkBtn = page.locator("button", { hasText: "Dark" });
    await darkBtn.click();
    let htmlClass = await page.locator("html").getAttribute("class");
    expect(htmlClass).toContain("dark");

    // Then set light
    const lightBtn = page.locator("button", { hasText: "Light" });
    await lightBtn.click();
    htmlClass = await page.locator("html").getAttribute("class");
    expect(htmlClass ?? "").not.toContain("dark");
  });

  test("dark mode preference persists after page reload", async ({ page }) => {
    const darkBtn = page.locator("button", { hasText: "Dark" });
    await darkBtn.click();

    // Reload — NoFlashScript in <head> re-applies dark class synchronously
    await page.reload();
    await page.waitForLoadState("domcontentloaded");

    const htmlClass = await page.locator("html").getAttribute("class");
    expect(htmlClass).toContain("dark");

    // Clean up
    await page.evaluate(() => localStorage.removeItem("tb-theme"));
  });
});

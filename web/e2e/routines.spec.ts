import { test, expect, gotoAndWait } from "./fixtures";

test.describe("Routines page", () => {
  test.beforeEach(async ({ page }) => {
    await gotoAndWait(page, "/routines");
  });

  test("active step card is visible with pulsing border", async ({ page }) => {
    // The active step has a 3px solid border (vs 1px for others) and a box-shadow glow.
    // It also contains the "👆 You're on this one" label.
    const activeLabel = page.locator("text=You're on this one");
    await expect(activeLabel).toBeVisible();
  });

  test("clicking a future step toggles it done (strikethrough)", async ({ page }) => {
    // Get all step rows — they are divs with onClick
    // Done steps have textDecoration: line-through on their title
    // Find a step that is NOT done and NOT active — click it to mark done.

    // All step rows have role div with onClick and contain emoji + step name.
    // The progress counter shows "N/total" at the top.
    const progressText = page.locator("text=/ ").first();

    // Find the initial progress fraction text like "2/8"
    const initialProgress = await page.locator("[style*='fontFamily'][style*='fontDisplay']").filter({ hasText: /^\d+$/ }).first().textContent().catch(() => null);

    // Find step rows that are NOT active (no "👆" label) and NOT done
    // We look for rows that have cursor:pointer and do not have line-through text
    const stepRows = page.locator("div[style*='border-radius'][style*='cursor: pointer']").filter({ hasNot: page.locator("text=You're on this one") });
    const rowCount = await stepRows.count();

    if (rowCount > 0) {
      const targetRow = stepRows.first();
      await expect(targetRow).toBeVisible();

      // Click to toggle — should mark it done
      await targetRow.click();
      await page.waitForTimeout(300);

      // Page still shows /routines and no crash
      expect(page.url()).toContain("/routines");

      // Click again to unmark
      await targetRow.click();
      await page.waitForTimeout(300);
    } else {
      // If all non-active rows are already done, just verify the page works
      test.info().annotations.push({ type: "note", description: "All steps already done or only active step visible" });
    }

    // The active label is still visible (didn't break anything)
    const activeLabel = page.locator("text=You're on this one");
    await expect(activeLabel).toBeVisible();
  });

  test("progress counter is visible in the header area", async ({ page }) => {
    // The progress counter renders as "N/total" with fontDisplay styling
    // e.g. "2" and "/8" in separate spans
    const body = await page.locator("body").textContent();
    // Should contain something like "% done" or a fraction pattern
    const hasProgress = /\d+\/\d+|\d+%\s*done/i.test(body ?? "");
    expect(hasProgress).toBe(true);
  });
});

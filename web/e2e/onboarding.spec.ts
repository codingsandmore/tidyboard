import { test, expect, gotoAndWait } from "./fixtures";

test.describe("Onboarding wizard", () => {
  test("steps through all 7 steps and finishes on /", async ({ page }) => {
    await gotoAndWait(page, "/onboarding");

    // The page has a dev breadcrumb showing "Step X / 7" and a Next/Finish button.
    // There is also an invisible overlay button (aria-label "Continue from <step>")
    // and the dev "Next" button in the footer breadcrumb.
    // We click the Next button in the dev nav footer.

    for (let step = 0; step < 6; step++) {
      // Current step indicator visible
      const stepLabel = page.locator(`text=Step ${step + 1} / 7`);
      await expect(stepLabel).toBeVisible();

      // Click the "Next" button in the dev breadcrumb footer
      const nextBtn = page.locator("button", { hasText: "Next" });
      await expect(nextBtn).toBeVisible();
      await nextBtn.click();
    }

    // Step 7 — "Finish" button should now be visible
    const stepLabel = page.locator("text=Step 7 / 7");
    await expect(stepLabel).toBeVisible();

    const finishBtn = page.locator("button", { hasText: "Finish" });
    await expect(finishBtn).toBeVisible();

    // Click Finish → redirects to /
    await finishBtn.click();
    await page.waitForURL("**/", { timeout: 10_000 });
    expect(page.url()).toMatch(/\/$|\/$/);
  });
});

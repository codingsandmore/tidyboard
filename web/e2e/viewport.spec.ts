import { test, expect } from "./fixtures";

test.describe("Viewport — adaptive dashboard variants", () => {
  test("360x800 (mobile) shows DashPhone indicators", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    // DashPhone renders "Thursday" as a large heading (fontDisplay, 24px)
    // It's visible because .tb-variant-phone { display: block } at ≤699px
    const thursdayHeading = page.locator(".tb-variant-phone").locator("text=Thursday");
    await expect(thursdayHeading).toBeVisible();

    // BottomNav is rendered inside DashPhone
    const bottomNav = page.locator(".tb-variant-phone nav, .tb-variant-phone [class*='bottom'], .tb-variant-phone [style*='bottom']").first();
    // Verify phone variant container itself is visible
    const phoneVariant = page.locator(".tb-variant-phone");
    await expect(phoneVariant).toBeVisible();
  });

  test("900x1200 (tablet/kiosk) shows DashKiosk indicators", async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 1200 });
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    // DashKiosk shows a large clock "10:34" and "Thursday, April 22"
    // It's visible because .tb-variant-kiosk { display: block } at 700–1199px
    const kioskVariant = page.locator(".tb-variant-kiosk");
    await expect(kioskVariant).toBeVisible();

    const clockText = page.locator(".tb-variant-kiosk").locator("text=10:34");
    await expect(clockText).toBeVisible();
  });

  test("1440x900 (desktop) shows DashDesktop indicators", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    // DashDesktop shows a sidebar with "The Smith Family" and "tidyboard"
    // It's visible because .tb-variant-desktop { display: block } at ≥1200px
    const desktopVariant = page.locator(".tb-variant-desktop");
    await expect(desktopVariant).toBeVisible();

    // Sidebar shows "The Smith Family"
    const smithFamily = page.locator(".tb-variant-desktop").locator("text=The Smith Family");
    await expect(smithFamily).toBeVisible();
  });
});

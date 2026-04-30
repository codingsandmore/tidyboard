import { test, expect, gotoAndWait } from "./fixtures";

const PROTECTED_ROUTES = [
  "/",
  "/calendar",
  "/routines",
  "/lists",
  "/recipes",
  "/meals",
  "/shopping",
  "/equity",
  "/settings",
  "/race",
  "/notes",
  "/wallet",
  "/chores",
  "/rewards",
  "/scoreboard",
  "/onboarding",
  "/admin/wallets",
  "/admin/chores",
  "/admin/ad-hoc",
];

const PUBLIC_ROUTES = ["/login", "/lock", "/kiosk", "/preview"];

test.describe("Smoke — auth boundary", () => {
  for (const path of PROTECTED_ROUTES) {
    test(`${path} redirects unauthenticated users to login`, async ({ page }) => {
      await gotoAndWait(page, path);

      await page.waitForURL(/\/login(?:\?returnTo=.*)?$/, { timeout: 10_000 });
      await expect(page.locator("body")).not.toContainText("The Smith Family");
    });
  }

  for (const path of PUBLIC_ROUTES) {
    test(`${path} remains public`, async ({ page }) => {
      await gotoAndWait(page, path);

      expect(page.url()).toContain(path);
      const body = await page.locator("body").textContent();
      expect((body ?? "").length).toBeGreaterThan(10);
    });
  }
});

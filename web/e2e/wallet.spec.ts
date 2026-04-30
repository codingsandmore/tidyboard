import { test, expect, gotoAndWait } from "./fixtures";

test.describe("Wallet — kid happy path (fallback mode)", () => {
  test("/wallet shows BALANCE label + a $ amount", async ({ page }) => {
    await gotoAndWait(page, "/wallet");
    await expect(page.locator("body")).toContainText("BALANCE");
    await expect(page.locator("body")).toContainText("$");
  });

  test("/chores shows chore name cards from fallback data", async ({ page }) => {
    await gotoAndWait(page, "/chores");
    // Fallback returns "Brush teeth" / "Make bed" / "Take out trash"
    await expect(page.getByText(/Brush teeth/).first()).toBeVisible();
    await expect(page.getByText(/Take out trash/).first()).toBeVisible();
  });
});

test.describe("Wallet — admin entry pages render (fallback mode)", () => {
  test("/admin/wallets renders the Kid wallets heading", async ({ page }) => {
    await gotoAndWait(page, "/admin/wallets");
    await expect(page.getByText(/Kid wallets/i)).toBeVisible();
  });

  test("/admin/chores renders the Chores heading + + New chore button", async ({ page }) => {
    await gotoAndWait(page, "/admin/chores");
    await expect(page.getByText(/^Chores$/i)).toBeVisible();
    await expect(page.getByText(/\+ New chore/i)).toBeVisible();
  });

  test("/admin/ad-hoc renders the Bonus tasks heading + Quick assign", async ({ page }) => {
    await gotoAndWait(page, "/admin/ad-hoc");
    await expect(page.getByText(/Bonus tasks/i)).toBeVisible();
    await expect(page.getByText(/Quick assign/i)).toBeVisible();
  });
});

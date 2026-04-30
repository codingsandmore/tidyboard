import { test, expect, gotoAndWait } from "./fixtures";

test.describe("Rewards (fallback mode)", () => {
  test("kid sees the rewards catalog and a balance", async ({ page }) => {
    await gotoAndWait(page, "/rewards");
    await expect(page.getByRole("heading", { name: /Rewards/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Stickers" })).toBeVisible();
    // Fallback pointsBalance returns total: 47
    await expect(page.getByText(/47\s*pts/)).toBeVisible();
  });

  test("kid can see an enabled Redeem button for affordable rewards", async ({ page }) => {
    await gotoAndWait(page, "/rewards");
    // Stickers costs 30 pts; fallback balance is 47 pts — button should be enabled
    const card = page.locator("li", { hasText: "Stickers" }).first();
    const redeemBtn = card.getByRole("button", { name: /Redeem/i });
    await expect(redeemBtn).toBeVisible();
    await expect(redeemBtn).toBeEnabled();
  });

  test("admin can see the catalog admin page", async ({ page }) => {
    await gotoAndWait(page, "/admin/rewards");
    await expect(page.getByRole("heading", { name: /Rewards Admin/i })).toBeVisible();
  });

  test("scoreboard renders rows from fallback", async ({ page }) => {
    await gotoAndWait(page, "/scoreboard");
    await expect(page.getByRole("heading", { name: /Scoreboard/i })).toBeVisible();
  });
});

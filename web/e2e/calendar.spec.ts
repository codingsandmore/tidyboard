import { test, expect, gotoAndWait } from "./fixtures";

test.describe("Calendar page", () => {
  test.beforeEach(async ({ page }) => {
    await gotoAndWait(page, "/calendar");
  });

  test("tab switcher — Week, Month, Agenda, Day views", async ({ page }) => {
    // Default view is Day — Day button should be present
    const dayBtn = page.locator("button", { hasText: "Day" });
    await expect(dayBtn).toBeVisible();

    // Switch to Week
    const weekBtn = page.locator("button", { hasText: "Week" });
    await weekBtn.click();
    // URL stays at /calendar, no navigation
    expect(page.url()).toContain("/calendar");
    await expect(weekBtn).toBeVisible();

    // Switch to Month
    const monthBtn = page.locator("button", { hasText: "Month" });
    await monthBtn.click();
    expect(page.url()).toContain("/calendar");

    // Switch to Agenda
    const agendaBtn = page.locator("button", { hasText: "Agenda" });
    await agendaBtn.click();
    expect(page.url()).toContain("/calendar");

    // Switch back to Day
    await dayBtn.click();
    expect(page.url()).toContain("/calendar");
  });

  test("+ Event button opens EventModal with conflict warning", async ({ page }) => {
    const addEventBtn = page.locator("button", { hasText: "+ Event" });
    await expect(addEventBtn).toBeVisible();
    await addEventBtn.click();

    // EventModal renders as an absolute overlay — it contains an input and conflict text
    const conflictText = page.locator("text=Conflicts with Mom");
    await expect(conflictText).toBeVisible();

    // Input (title field) with pre-filled value
    const titleInput = page.locator("input[value='Dentist — Jackson']");
    await expect(titleInput).toBeVisible();
  });

  test("EventModal can be dismissed by navigating away", async ({ page }) => {
    const addEventBtn = page.locator("button", { hasText: "+ Event" });
    await addEventBtn.click();

    const conflictText = page.locator("text=Conflicts with Mom");
    await expect(conflictText).toBeVisible();

    // Navigate to home and back — modal is gone
    await page.goto("/");
    await page.goto("/calendar");
    await expect(conflictText).not.toBeVisible();
  });
});

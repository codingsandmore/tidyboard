import { test, expect, gotoAndWait, screenshot } from "./fixtures";
import AxeBuilder from "@axe-core/playwright";

const A11Y_ROUTES = ["/login", "/onboarding", "/preview", "/lock", "/settings/preview"];

test.describe("Accessibility — axe-core scans", () => {
  for (const route of A11Y_ROUTES) {
    test(`${route} has zero critical violations`, async ({ page }) => {
      await gotoAndWait(page, route);

      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa"])
        .analyze();

      const critical = results.violations.filter((v) => v.impact === "critical");

      if (critical.length > 0) {
        const summary = critical
          .map((v) => `[${v.id}] ${v.description} (${v.nodes.length} nodes)`)
          .join("\n");
        console.error(`Critical a11y violations on ${route}:\n${summary}`);
      }

      expect(critical).toHaveLength(0);
    });
  }

  test("/login — focus ring visible on interactive elements (screenshot)", async ({ page }) => {
    await gotoAndWait(page, "/login");

    // Tab to the first focusable element
    await page.keyboard.press("Tab");
    await page.waitForTimeout(100);

    // Take a screenshot showing the focused element
    const screenshotPath = await screenshot(page, "focus-ring-homepage");
    console.info(`Focus ring screenshot saved: ${screenshotPath}`);

    // Verify at least one element has focus (document.activeElement is not body)
    const focusedTag = await page.evaluate(() => document.activeElement?.tagName ?? "BODY");
    expect(focusedTag).not.toBe("BODY");
  });
});

import { test as base, type Page } from "@playwright/test";
import * as path from "path";
import * as fs from "fs";

// Helpers exposed to every test file via re-export.

/** Navigate to `path` and wait for the page to be hydrated (networkidle). */
export async function gotoAndWait(page: Page, urlPath: string): Promise<void> {
  await page.goto(urlPath);
  await page.waitForLoadState("domcontentloaded");
}

/** Take a screenshot and save it under test-results/screenshots/<name>.png. */
export async function screenshot(page: Page, name: string): Promise<string> {
  const dir = path.join(process.cwd(), "test-results", "screenshots");
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, `${name}.png`);
  await page.screenshot({ path: filePath, fullPage: false });
  return filePath;
}

// Re-export base test so spec files can import from fixtures.ts.
export { expect } from "@playwright/test";
export const test = base;

import { defineConfig, devices } from "@playwright/test";

/**
 * Production e2e config.
 *
 * Targets the live https://tidyboard.org deployment. NO local stack is
 * spun up — the tests hit real Cognito + the Path C EC2.
 *
 * Two test classes:
 *   - tests/public.spec.ts — no auth required, run on every CI push
 *   - tests/family-flow.spec.ts — needs TIDYBOARD_TEST_TOKEN env var; skips
 *     gracefully if absent so unconfigured CI runs don't fail
 *
 * Run with: npm run e2e:prod   (from web/)
 */

const PROD_BASE = process.env.TIDYBOARD_PROD_URL ?? "https://tidyboard.org";

export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.spec.ts",
  // Production network can be slow + Cognito latency adds up
  timeout: 60_000,
  // No parallelism — tests share a test household and would race each other
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report-prod" }]],

  use: {
    baseURL: PROD_BASE,
    headless: true,
    trace: "retain-on-failure",
    // Production HTTPS — accept the real cert
    ignoreHTTPSErrors: false,
  },

  projects: [
    {
      name: "prod-chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  // No webServer — we hit the live deployment.
});

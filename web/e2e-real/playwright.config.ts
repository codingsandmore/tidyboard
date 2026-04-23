import { defineConfig, devices } from "@playwright/test";
import * as path from "path";

/**
 * Playwright config for real-stack e2e tests.
 *
 * These tests require a running Go backend + Postgres + Redis.
 * Use `make e2e-real` from the repo root to orchestrate the full stack,
 * or run `npm run e2e:real` if the stack is already up.
 *
 * The stack is managed by global-setup.ts / global-teardown.ts so that
 * containers start before any browser is launched and stop afterwards.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";
const NEXT_URL = process.env.NEXT_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: path.join(__dirname),
  testMatch: "**/*.spec.ts",
  // Give each test plenty of time — the real stack can be slower.
  timeout: 120_000,
  // Each worker gets its own clean state; we only run one at a time to avoid
  // DB races. (The global reset endpoint is coarse-grained.)
  workers: 1,
  retries: 0,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report-real" }]],

  globalSetup: path.join(__dirname, "global-setup.ts"),
  globalTeardown: path.join(__dirname, "global-teardown.ts"),

  use: {
    baseURL: NEXT_URL,
    headless: true,
    viewport: { width: 1280, height: 720 },
    // Keep all API traffic — useful for debugging flakes.
    trace: "retain-on-failure",
    // Expose the real API URL to the Next.js dev server and to tests.
    extraHTTPHeaders: {},
  },

  projects: [
    {
      name: "chromium-real",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: {
    // Next.js dev server pointed at the real backend.
    command: `NEXT_PUBLIC_API_URL=${API_URL} npm run dev`,
    url: NEXT_URL,
    timeout: 120_000,
    // Reuse an already-running dev server in local dev; always fresh in CI.
    reuseExistingServer: !process.env.CI,
    env: {
      NEXT_PUBLIC_API_URL: API_URL,
    },
    cwd: path.join(__dirname, ".."),
  },
});

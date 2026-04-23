import { defineConfig, devices } from "@playwright/test";

const isCI = !!process.env.CI;

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  retries: isCI ? 1 : 0,
  reporter: isCI
    ? [["html", { open: "never" }], ["github"]]
    : [["list"]],
  use: {
    baseURL: "http://localhost:3000",
    headless: true,
    viewport: { width: 1280, height: 720 },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile-safari",
      use: { ...devices["iPhone 14"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    port: 3000,
    timeout: 120_000,
    reuseExistingServer: !isCI,
    env: {
      NEXT_PUBLIC_API_URL: "",
    },
  },
});

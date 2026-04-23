/**
 * helpers/fixtures.ts
 *
 * Custom Playwright fixtures for real-stack tests.
 *
 * Provides:
 *   - `skipIfNoDocker`: auto-skips the test if Docker was unavailable at setup
 *   - `resetDB`: truncates all tables via POST /v1/admin/reset before each test
 *   - `apiToken`: registers a fresh account and returns its JWT
 *   - `authedPage`: a Page already logged in as the admin account
 */

import { test as base, expect } from "@playwright/test";
import { apiReset, apiRegister, apiLogin } from "./api";

// ── Types ──────────────────────────────────────────────────────────────────

export interface TestAccount {
  email: string;
  password: string;
  token: string;
}

export interface RealFixtures {
  /** Skips the test if Docker was not available during global-setup. */
  skipIfNoDocker: void;
  /** Resets the DB to a clean state before the test body runs. */
  resetDB: void;
  /** Returns a fresh authenticated account JWT. */
  testAccount: TestAccount;
}

// ── Fixtures ───────────────────────────────────────────────────────────────

export const test = base.extend<RealFixtures>({
  // Auto-fixture: skip when Docker is unavailable.
  skipIfNoDocker: [
    async ({}, use, testInfo) => {
      if (process.env.E2E_REAL_SKIP === "1") {
        testInfo.skip(true, "Docker is not available — skipping real-stack test");
      }
      await use();
    },
    { auto: true },
  ],

  // Auto-fixture: reset DB before every test.
  resetDB: [
    async ({}, use) => {
      try {
        await apiReset();
      } catch (err) {
        // If the server isn't up yet this will fail. Treat as non-fatal here;
        // the real failure will surface when the test tries to use the API.
        console.warn("[fixture] apiReset failed (server may not be up):", err);
      }
      await use();
    },
    { auto: true },
  ],

  // Provides a freshly-registered account.
  testAccount: async ({}, use) => {
    const ts = Date.now();
    const email = `e2e+${ts}@test.tidyboard.local`;
    const password = "TestPassword123!";

    let token: string;
    try {
      const resp = await apiRegister(email, password);
      token = resp.token;
    } catch {
      // Registration might fail if the email already exists (unlikely with
      // timestamp, but defend against it).
      const resp = await apiLogin(email, password);
      token = resp.token;
    }

    await use({ email, password, token });
  },
});

export { expect };

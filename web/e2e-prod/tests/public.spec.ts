import { test, expect, request } from "@playwright/test";
import { apiHealth, apiReady, apiMe, apiPinLogin, ApiError } from "../helpers/api";

const BASE = process.env.TIDYBOARD_PROD_URL ?? "https://tidyboard.org";

test.describe("Production — public surface", () => {
  test("/health returns 200 with status:ok", async () => {
    const res = await apiHealth();
    expect(res.status).toBe("ok");
  });

  test("/ready returns 200 with status:ok (DB + Redis reachable)", async () => {
    const res = await apiReady();
    expect(res.status).toBe("ok");
  });

  test("auth-required endpoints return 401 without token", async ({ request }) => {
    for (const path of [
      "/v1/auth/me",
      "/v1/events",
      "/v1/lists",
      "/v1/recipes",
      "/v1/routines",
      "/v1/equity",
      "/v1/calendars",
      "/v1/audit",
      "/v1/billing/subscription",
    ]) {
      const r = await request.get(`${BASE}${path}`);
      expect(
        r.status(),
        `${path} should be 401 unauthenticated, got ${r.status()}`
      ).toBe(401);
    }
  });

  test("/v1/auth/me with a clearly-bogus token returns 401", async () => {
    await expect(apiMe("not-a-real-token")).rejects.toMatchObject({
      status: 401,
    });
  });

  test("/v1/auth/pin without body returns 400 (handler reachable)", async ({ request }) => {
    const r = await request.post(`${BASE}/v1/auth/pin`, { data: {} });
    expect([400, 401]).toContain(r.status());
  });

  test("frontend pages return 200 (not 404/500)", async ({ request }) => {
    const pages = [
      "/",
      "/calendar",
      "/routines",
      "/lists",
      "/recipes",
      "/meals",
      "/shopping",
      "/equity",
      "/settings",
      "/lock",
      "/notes",
      "/onboarding",
    ];
    for (const path of pages) {
      const r = await request.get(`${BASE}${path}`);
      expect(
        r.status(),
        `${path} should serve, got ${r.status()}`
      ).toBeLessThan(400);
    }
  });
});

test.describe("Production — pin login error paths", () => {
  test("invalid PIN returns 401", async () => {
    // Even a non-existent member should produce 401 (or 404), never 500
    try {
      await apiPinLogin("00000000-0000-0000-0000-000000000000", "0000");
      throw new Error("expected error");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      const status = (err as ApiError).status;
      expect([400, 401, 404]).toContain(status);
    }
  });
});

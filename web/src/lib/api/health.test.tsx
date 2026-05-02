/**
 * useSystemHealth — combines /health (liveness) and /ready (readiness)
 * into a single status the UI can render. The hook decides whether the
 * system is healthy, degraded, or down based on what each endpoint
 * returns; this test exercises the three combinations the user-facing
 * indicator depends on.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useSystemHealth } from "./health";

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  return { qc, Wrapper };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("useSystemHealth", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("returns healthy when /health and /ready both return 200 ok", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : (input as Request).url ?? String(input);
      if (url.endsWith("/health")) {
        return jsonResponse({ status: "ok", timestamp: "2026-05-02T00:00:00Z", version: "abc123" });
      }
      if (url.endsWith("/ready")) {
        return jsonResponse({ status: "ok", checks: { db: "ok", redis: "ok" } });
      }
      throw new Error(`unexpected url ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useSystemHealth(), { wrapper: Wrapper });

    await waitFor(() => {
      expect(result.current.status).toBe("healthy");
    });
    expect(result.current.version).toBe("abc123");
    expect(result.current.checks).toEqual({ db: "ok", redis: "ok" });
    expect(result.current.failures).toEqual([]);
  });

  it("returns degraded when /ready returns 503 with failures", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : (input as Request).url ?? String(input);
      if (url.endsWith("/health")) {
        return jsonResponse({ status: "ok", timestamp: "2026-05-02T00:00:00Z" });
      }
      if (url.endsWith("/ready")) {
        return jsonResponse(
          { status: "degraded", checks: { db: "ok", redis: "fail: timeout" }, failures: ["redis"] },
          503
        );
      }
      throw new Error(`unexpected url ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useSystemHealth(), { wrapper: Wrapper });

    await waitFor(() => {
      expect(result.current.status).toBe("degraded");
    });
    expect(result.current.failures).toEqual(["redis"]);
    expect(result.current.checks.redis).toBe("fail: timeout");
  });

  it("returns down when /health is unreachable", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : (input as Request).url ?? String(input);
      if (url.endsWith("/health")) {
        return new Response("502 Bad Gateway", { status: 502 });
      }
      if (url.endsWith("/ready")) {
        // /ready is also unreachable in this scenario; still returns transport
        // failure so the readiness query errors out.
        return new Response("502 Bad Gateway", { status: 502 });
      }
      throw new Error(`unexpected url ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useSystemHealth(), { wrapper: Wrapper });

    await waitFor(() => {
      expect(result.current.status).toBe("down");
    });
  });
});

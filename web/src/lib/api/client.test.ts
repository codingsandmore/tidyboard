import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { api } from "./client";

// Mock global fetch
const mockFetch = vi.fn();

function makeResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : "Error",
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

beforeEach(() => {
  mockFetch.mockReset();
  vi.stubGlobal("fetch", mockFetch);
  // Default: no token
  vi.stubGlobal("localStorage", {
    getItem: vi.fn().mockReturnValue(null),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("api.get", () => {
  it("fetches the correct URL", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse({ id: 1 }));
    const result = await api.get<{ id: number }>("/v1/test");
    expect(result).toEqual({ id: 1 });
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/v1/test"),
      expect.objectContaining({ method: "GET" })
    );
  });

  it("includes Authorization header when token is in localStorage", async () => {
    vi.stubGlobal("localStorage", {
      getItem: vi.fn().mockReturnValue("my-token"),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
    mockFetch.mockResolvedValueOnce(makeResponse({}));
    await api.get("/v1/test");
    const [, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect((opts.headers as Record<string, string>)["Authorization"]).toBe(
      "Bearer my-token"
    );
  });

  it("omits Authorization header when no token", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse({}));
    await api.get("/v1/test");
    const [, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(
      (opts.headers as Record<string, string>)["Authorization"]
    ).toBeUndefined();
  });

  it("throws ApiError on non-2xx with JSON error body", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse({ code: "NOT_FOUND", message: "not found", status: 404 }, 404));
    await expect(api.get("/v1/missing")).rejects.toMatchObject({
      code: "NOT_FOUND",
      message: "not found",
      status: 404,
    });
  });

  it("throws ApiError with UNKNOWN code when body is not JSON", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: "Server Error",
      json: () => Promise.reject(new Error("not json")),
    } as unknown as Response);
    await expect(api.get("/v1/boom")).rejects.toMatchObject({
      code: "UNKNOWN",
      status: 500,
    });
  });

  it("returns undefined for 204 No Content", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 204,
      statusText: "No Content",
      json: () => Promise.resolve(undefined),
    } as unknown as Response);
    const result = await api.get("/v1/noop");
    expect(result).toBeUndefined();
  });
});

describe("api.post", () => {
  it("sends body as JSON", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse({ created: true }));
    await api.post("/v1/items", { name: "test" });
    const [, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(opts.method).toBe("POST");
    expect(opts.body).toBe(JSON.stringify({ name: "test" }));
    expect((opts.headers as Record<string, string>)["Content-Type"]).toBe(
      "application/json"
    );
  });
});

describe("api.put", () => {
  it("sends PUT request", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse({ updated: true }));
    await api.put("/v1/items/1", { done: true });
    const [, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(opts.method).toBe("PUT");
  });
});

describe("api.delete", () => {
  it("sends DELETE request", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 204,
      statusText: "No Content",
      json: () => Promise.resolve(undefined),
    } as unknown as Response);
    await api.delete("/v1/items/1");
    const [, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(opts.method).toBe("DELETE");
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { api } from "./client";

// Mock global fetch
const mockFetch = vi.fn();

function makeResponse(
  body: unknown,
  status = 200,
  headers: Record<string, string> = {}
): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : "Error",
    headers: {
      get: (name: string) => headers[name] ?? headers[name.toLowerCase()] ?? null,
    },
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

  it("throws ApiError with non_json_response code when body is not JSON", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: "Server Error",
      headers: { get: () => null },
      json: () => Promise.reject(new Error("not json")),
    } as unknown as Response);
    await expect(api.get("/v1/boom")).rejects.toMatchObject({
      code: "non_json_response",
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
      headers: { get: () => null },
      json: () => Promise.resolve(undefined),
    } as unknown as Response);
    await api.delete("/v1/items/1");
    const [, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(opts.method).toBe("DELETE");
  });
});

describe("ApiError envelope", () => {
  it("captures X-Request-ID header onto thrown ApiError", async () => {
    mockFetch.mockResolvedValueOnce(
      makeResponse(
        { code: "not_found", message: "missing", status: 404 },
        404,
        { "X-Request-ID": "req-abc-123" }
      )
    );
    await expect(api.get("/v1/missing")).rejects.toMatchObject({
      code: "not_found",
      message: "missing",
      status: 404,
      requestId: "req-abc-123",
      url: expect.stringContaining("/v1/missing"),
      method: "GET",
    });
  });

  it("synthesizes non_json_response shape on 500 with non-JSON body", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      headers: {
        get: (name: string) =>
          name === "X-Request-ID" || name === "x-request-id"
            ? "req-xyz-999"
            : null,
      },
      json: () => Promise.reject(new Error("not json")),
    } as unknown as Response);

    await expect(api.post("/v1/boom", { x: 1 })).rejects.toMatchObject({
      code: "non_json_response",
      message: "Internal Server Error",
      status: 500,
      requestId: "req-xyz-999",
      method: "POST",
      url: expect.stringContaining("/v1/boom"),
    });
  });

  it("falls back to 'Server error' when statusText empty on non-JSON", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: "",
      headers: { get: () => null },
      json: () => Promise.reject(new Error("not json")),
    } as unknown as Response);

    await expect(api.get("/v1/boom")).rejects.toMatchObject({
      code: "non_json_response",
      message: "Server error",
      status: 500,
    });
  });

  it("populates url and method on every ApiError throw", async () => {
    mockFetch.mockResolvedValueOnce(
      makeResponse({ code: "bad", message: "no", status: 400 }, 400)
    );
    await expect(api.put("/v1/widgets/42", { name: "n" })).rejects.toMatchObject({
      method: "PUT",
      url: expect.stringContaining("/v1/widgets/42"),
    });
  });
});

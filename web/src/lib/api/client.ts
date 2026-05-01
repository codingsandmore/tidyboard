/**
 * Thin fetch wrapper for the Tidyboard REST API.
 *
 * Base URL: process.env.NEXT_PUBLIC_API_URL (default http://localhost:8080)
 * Auth:     reads "tb-auth-token" from localStorage and sends as Bearer token.
 * Errors:   throws ApiError on non-2xx responses.
 */

import type { ApiError } from "./types";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem("tb-auth-token");
  } catch {
    return null;
  }
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    // Capture the X-Request-ID header set by the backend's request-id
    // middleware (PR #123) so debug UIs can echo it for support tickets.
    const requestId = res.headers?.get?.("X-Request-ID") ?? undefined;

    let envelope: { code: string; message: string; status: number };
    try {
      envelope = await res.json();
    } catch {
      // Non-JSON responses (proxy errors, plain-text 5xx, etc.) get a
      // synthesized envelope so callers can still rely on the shape.
      envelope = {
        code: "non_json_response",
        message: res.statusText || "Server error",
        status: res.status,
      };
    }

    const err: ApiError = {
      code: envelope.code,
      message: envelope.message,
      status: envelope.status ?? res.status,
      requestId: requestId ?? undefined,
      url,
      method,
    };
    throw err;
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;

  return res.json() as Promise<T>;
}

export const api = {
  get<T>(path: string): Promise<T> {
    return request<T>("GET", path);
  },
  post<T>(path: string, body: unknown): Promise<T> {
    return request<T>("POST", path, body);
  },
  put<T>(path: string, body: unknown): Promise<T> {
    return request<T>("PUT", path, body);
  },
  patch<T>(path: string, body: unknown): Promise<T> {
    return request<T>("PATCH", path, body);
  },
  delete<T>(path: string): Promise<T> {
    return request<T>("DELETE", path);
  },
};

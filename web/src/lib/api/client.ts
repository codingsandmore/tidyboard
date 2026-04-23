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

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let err: ApiError;
    try {
      err = await res.json();
    } catch {
      err = {
        code: "UNKNOWN",
        message: res.statusText || "Request failed",
        status: res.status,
      };
    }
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
  delete<T>(path: string): Promise<T> {
    return request<T>("DELETE", path);
  },
};

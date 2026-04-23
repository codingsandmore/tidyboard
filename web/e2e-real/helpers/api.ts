/**
 * helpers/api.ts
 *
 * Thin wrapper around fetch for calling the Go backend directly from
 * test setup / teardown code.  Browser-based API calls use the Next.js
 * client; this helper is for Node.js test orchestration only.
 */

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

// ── Low-level ──────────────────────────────────────────────────────────────

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  token?: string
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  if (!res.ok) {
    throw new Error(
      `API ${method} ${path} → ${res.status}: ${JSON.stringify(data)}`
    );
  }

  return data as T;
}

// ── Auth ───────────────────────────────────────────────────────────────────

export interface AuthResponse {
  token: string;
  refresh_token?: string;
  expires_at: string;
}

export async function apiRegister(
  email: string,
  password: string
): Promise<AuthResponse> {
  return request<AuthResponse>("POST", "/v1/auth/register", { email, password });
}

export async function apiLogin(
  email: string,
  password: string
): Promise<AuthResponse> {
  return request<AuthResponse>("POST", "/v1/auth/login", { email, password });
}

export async function apiPINLogin(
  householdId: string,
  memberId: string,
  pin: string
): Promise<AuthResponse> {
  return request<AuthResponse>("POST", "/v1/auth/pin", {
    household_id: householdId,
    member_id: memberId,
    pin,
  });
}

export async function apiMe(token: string): Promise<{
  account_id: string;
  household_id: string;
  member_id: string;
  role: string;
}> {
  return request("GET", "/v1/auth/me", undefined, token);
}

// ── Households ────────────────────────────────────────────────────────────

export interface Household {
  id: string;
  name: string;
}

export async function apiCreateHousehold(
  token: string,
  name: string
): Promise<Household> {
  return request<Household>("POST", "/v1/households", { name }, token);
}

// ── Members ───────────────────────────────────────────────────────────────

export interface Member {
  id: string;
  household_id: string;
  name: string;
  display_name: string;
  role: string;
  age_group: string;
  color: string;
}

export async function apiCreateMember(
  token: string,
  householdId: string,
  member: {
    name: string;
    display_name: string;
    role: string;
    age_group: string;
    color: string;
    pin?: string;
  }
): Promise<Member> {
  return request<Member>(
    "POST",
    `/v1/households/${householdId}/members`,
    member,
    token
  );
}

export async function apiListMembers(
  token: string,
  householdId: string
): Promise<Member[]> {
  return request<Member[]>(
    "GET",
    `/v1/households/${householdId}/members`,
    undefined,
    token
  );
}

// ── Events ────────────────────────────────────────────────────────────────

export interface TBEvent {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
}

export async function apiCreateEvent(
  token: string,
  event: {
    title: string;
    start_time: string;
    end_time: string;
    all_day?: boolean;
    description?: string;
  }
): Promise<TBEvent> {
  return request<TBEvent>("POST", "/v1/events", event, token);
}

export async function apiListEvents(token: string): Promise<TBEvent[]> {
  return request<TBEvent[]>("GET", "/v1/events", undefined, token);
}

// ── Lists ─────────────────────────────────────────────────────────────────

export interface TBList {
  id: string;
  name: string;
  type: string;
}

export interface TBListItem {
  id: string;
  list_id: string;
  text: string;
  completed: boolean;
}

export async function apiCreateList(
  token: string,
  list: { name: string; type: string; shared?: boolean }
): Promise<TBList> {
  return request<TBList>("POST", "/v1/lists", { shared: true, ...list }, token);
}

export async function apiCreateListItem(
  token: string,
  listId: string,
  item: { text: string; priority?: string }
): Promise<TBListItem> {
  return request<TBListItem>(
    "POST",
    `/v1/lists/${listId}/items`,
    { priority: "none", ...item },
    token
  );
}

export async function apiListItems(
  token: string,
  listId: string
): Promise<TBListItem[]> {
  return request<TBListItem[]>(
    "GET",
    `/v1/lists/${listId}/items`,
    undefined,
    token
  );
}

export async function apiUpdateListItem(
  token: string,
  listId: string,
  itemId: string,
  patch: { completed?: boolean; text?: string }
): Promise<TBListItem> {
  return request<TBListItem>(
    "PATCH",
    `/v1/lists/${listId}/items/${itemId}`,
    patch,
    token
  );
}

// ── Admin reset ───────────────────────────────────────────────────────────

/**
 * Truncates all application tables via POST /v1/admin/reset.
 * Only available when the server is started with TIDYBOARD_ALLOW_RESET=true.
 */
export async function apiReset(): Promise<void> {
  await request<unknown>("POST", "/v1/admin/reset", {});
}

// ── Health ────────────────────────────────────────────────────────────────

export async function apiWaitForHealth(
  timeoutMs = 30_000,
  intervalMs = 500
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let lastErr: unknown;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${BASE}/health`);
      if (res.ok) return;
    } catch (err) {
      lastErr = err;
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error(
    `Go server not healthy after ${timeoutMs}ms. Last error: ${lastErr}`
  );
}

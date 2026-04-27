/**
 * Thin fetch wrapper for the production Tidyboard API.
 *
 * No SDK dependency, no Cognito complexity in the test layer — the caller
 * either provides a Bearer token (obtained from a browser session, see
 * README.md) or skips auth-requiring tests.
 */

const API_BASE =
  process.env.TIDYBOARD_PROD_URL?.replace(/\/+$/, "") ?? "https://tidyboard.org";

export class ApiError extends Error {
  constructor(public status: number, public body: unknown, message: string) {
    super(message);
  }
}

async function request<T>(
  method: string,
  path: string,
  opts: { token?: string; body?: unknown; expectStatus?: number } = {}
): Promise<T> {
  const url = `${API_BASE}${path}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;

  const res = await fetch(url, {
    method,
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });

  const text = await res.text();
  let parsed: unknown = text;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    /* leave as text */
  }

  const wantedStatus = opts.expectStatus ?? -1;
  if (wantedStatus !== -1 ? res.status !== wantedStatus : !res.ok) {
    throw new ApiError(
      res.status,
      parsed,
      `${method} ${path} -> ${res.status} ${res.statusText} (expected ${
        wantedStatus === -1 ? "2xx" : wantedStatus
      })`
    );
  }
  return parsed as T;
}

// ── Public, unauthenticated ─────────────────────────────────────────────

export const apiHealth = () => request<{ status: string }>("GET", "/health");
export const apiReady = () => request<{ status: string }>("GET", "/ready");

// ── Auth ────────────────────────────────────────────────────────────────

export interface MeResponse {
  account_id: string;
  household_id: string;
  member_id: string;
  email?: string;
  role: string;
}
export const apiMe = (token: string) => request<MeResponse>("GET", "/v1/auth/me", { token });

export const apiPinLogin = (memberId: string, pin: string) =>
  request<{ token: string; member_id: string }>("POST", "/v1/auth/pin", {
    body: { member_id: memberId, pin },
  });

// ── Households + members ────────────────────────────────────────────────

export interface HouseholdResponse {
  id: string;
  name: string;
}
export interface MemberResponse {
  id: string;
  household_id: string;
  name: string;
  display_name: string;
  role: string;
  color: string;
}

export const apiCreateHousehold = (token: string, body: { name: string }) =>
  request<HouseholdResponse>("POST", "/v1/households", { token, body });

export const apiDeleteHousehold = (token: string, id: string) =>
  request<unknown>("DELETE", `/v1/households/${id}`, { token });

export const apiListMembers = (token: string, householdId: string) =>
  request<MemberResponse[]>("GET", `/v1/households/${householdId}/members`, { token });

export const apiCreateMember = (
  token: string,
  householdId: string,
  body: {
    name: string;
    display_name: string;
    role: "adult" | "child";
    color: string;
    pin?: string;
  }
) => request<MemberResponse>("POST", `/v1/households/${householdId}/members`, { token, body });

export const apiDeleteMember = (token: string, householdId: string, memberId: string) =>
  request<unknown>("DELETE", `/v1/households/${householdId}/members/${memberId}`, { token });

// ── Events ──────────────────────────────────────────────────────────────

export interface EventResponse {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  location?: string;
  description?: string;
  recurrence_rule?: string;
}

export const apiCreateEvent = (
  token: string,
  body: {
    title: string;
    start_time: string;
    end_time: string;
    location?: string;
    description?: string;
    recurrence_rule?: string;
  }
) => request<EventResponse>("POST", "/v1/events", { token, body });

export const apiListEvents = (token: string, range?: { start: string; end: string }) => {
  const qs = range ? `?start=${encodeURIComponent(range.start)}&end=${encodeURIComponent(range.end)}` : "";
  return request<EventResponse[]>("GET", `/v1/events${qs}`, { token });
};

export const apiDeleteEvent = (token: string, id: string) =>
  request<unknown>("DELETE", `/v1/events/${id}`, { token });

// ── Lists + items ───────────────────────────────────────────────────────

export interface ListResponse {
  id: string;
  name: string;
  type: string;
}
export interface ListItemResponse {
  id: string;
  list_id: string;
  text: string;
  completed: boolean;
}

export const apiCreateList = (token: string, body: { name: string; type?: string }) =>
  request<ListResponse>("POST", "/v1/lists", { token, body });

export const apiDeleteList = (token: string, id: string) =>
  request<unknown>("DELETE", `/v1/lists/${id}`, { token });

export const apiCreateListItem = (token: string, listId: string, body: { text: string }) =>
  request<ListItemResponse>("POST", `/v1/lists/${listId}/items`, { token, body });

export const apiListItems = (token: string, listId: string) =>
  request<ListItemResponse[]>("GET", `/v1/lists/${listId}/items`, { token });

export const apiToggleListItem = (
  token: string,
  listId: string,
  itemId: string,
  completed: boolean
) =>
  request<ListItemResponse>("PATCH", `/v1/lists/${listId}/items/${itemId}`, {
    token,
    body: { completed },
  });

// ── Wallet / Chores ─────────────────────────────────────────────────────

export interface ChoreResponse {
  id: string;
  household_id: string;
  member_id: string;
  name: string;
  weight: number;
  frequency_kind: string;
  auto_approve: boolean;
}

export interface WalletGetResponseE2E {
  wallet: { id: string; balance_cents: number };
  transactions: Array<{ id: string; amount_cents: number; kind: string; reason: string }>;
}

export const apiCreateChore = (
  token: string,
  body: { member_id: string; name: string; weight: number; frequency_kind: string; auto_approve: boolean }
) => request<ChoreResponse>("POST", "/v1/chores", { token, body });

export const apiCompleteChore = (token: string, choreId: string, date?: string) =>
  request<unknown>("POST", `/v1/chores/${choreId}/complete${date ? `?date=${date}` : ""}`, { token });

export const apiGetWallet = (token: string, memberId: string) =>
  request<WalletGetResponseE2E>("GET", `/v1/wallet/${memberId}`, { token });

export const apiTip = (token: string, memberId: string, amount_cents: number, reason: string) =>
  request<unknown>("POST", `/v1/wallet/${memberId}/tip`, { token, body: { amount_cents, reason } });

export const apiUpsertAllowance = (token: string, memberId: string, amount_cents: number) =>
  request<unknown>("PUT", `/v1/allowance/${memberId}`, { token, body: { amount_cents } });

export const apiCashOut = (token: string, memberId: string, amount_cents: number) =>
  request<unknown>("POST", `/v1/wallet/${memberId}/cash-out`, { token, body: { amount_cents, method: "cash", note: "e2e" } });

export const apiArchiveChore = (token: string, choreId: string) =>
  request<unknown>("DELETE", `/v1/chores/${choreId}`, { token });

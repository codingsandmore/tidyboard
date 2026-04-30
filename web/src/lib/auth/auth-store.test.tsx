import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";
import { AuthProvider, useAuth } from "./auth-store";

const HOUSEHOLD_ID = "11111111-1111-4111-8111-111111111111";
const COGNITO_HOUSEHOLD_ID = "22222222-2222-4222-8222-222222222222";

// ── Helpers ────────────────────────────────────────────────────────────────

function makeLocalStorageMock() {
  const store: Record<string, string> = {};
  return {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => {
      store[k] = v;
    },
    removeItem: (k: string) => {
      delete store[k];
    },
    clear: () => {
      for (const k in store) delete store[k];
    },
  };
}

// Consumer component that exposes auth state via data-testid spans.
function AuthDisplay() {
  const auth = useAuth();
  return (
    <div>
      <span data-testid="status">{auth.status}</span>
      <span data-testid="token">{auth.token ?? "null"}</span>
      <span data-testid="account-id">{auth.account?.id ?? "null"}</span>
      <span data-testid="household-id">{auth.household?.id ?? "null"}</span>
      <button onClick={() => auth.acceptToken("test-id-token").catch(() => {})}>
        accept
      </button>
      <button onClick={auth.logout}>logout</button>
    </div>
  );
}

// ── Setup / teardown ───────────────────────────────────────────────────────

beforeEach(() => {
  vi.stubGlobal("localStorage", makeLocalStorageMock());
  // window.location.assign is called by oidc.signOut() during logout; stub it
  // so JSDOM doesn't navigate (which would tear the test environment down).
  if (typeof window !== "undefined" && window.location) {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...window.location, assign: vi.fn(), replace: vi.fn() },
    });
  }
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// ── Provider mount ─────────────────────────────────────────────────────────

describe("AuthProvider", () => {
  it("mounts without crashing", () => {
    render(
      <AuthProvider>
        <AuthDisplay />
      </AuthProvider>,
    );
    expect(screen.getByTestId("status")).toBeTruthy();
  });
});

// ── No stored token ────────────────────────────────────────────────────────

describe("no stored token", () => {
  it("resolves to unauthenticated when localStorage is empty", async () => {
    render(
      <AuthProvider>
        <AuthDisplay />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("status").textContent).toBe("unauthenticated");
    });
    expect(screen.getByTestId("token").textContent).toBe("null");
  });
});

// ── Hydration from stored token ────────────────────────────────────────────

describe("/me hydration", () => {
  it("hydrates from stored token successfully", async () => {
    localStorage.setItem("tb-auth-token", "existing-token");

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          account_id: "acct-1",
          household_id: HOUSEHOLD_ID,
          member_id: "mem-1",
          role: "adult",
        }),
      }),
    );

    render(
      <AuthProvider>
        <AuthDisplay />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("status").textContent).toBe("authenticated");
    });
    expect(screen.getByTestId("account-id").textContent).toBe("acct-1");
    expect(screen.getByTestId("household-id").textContent).toBe(HOUSEHOLD_ID);
  });

  it("clears token and goes unauthenticated when /me fails", async () => {
    localStorage.setItem("tb-auth-token", "bad-token");

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        json: async () => ({ code: "UNAUTHORIZED", message: "Unauthorized", status: 401 }),
      }),
    );

    render(
      <AuthProvider>
        <AuthDisplay />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("status").textContent).toBe("unauthenticated");
    });
    expect(localStorage.getItem("tb-auth-token")).toBeNull();
  });

  it("accepts a Cognito-style /me with no household yet (mid-onboarding)", async () => {
    localStorage.setItem("tb-auth-token", "tok");

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          account_id: "acct-fresh",
          household_id: null,
          member_id: null,
          role: "",
        }),
      }),
    );

    render(
      <AuthProvider>
        <AuthDisplay />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("status").textContent).toBe("authenticated");
    });
    expect(screen.getByTestId("account-id").textContent).toBe("acct-fresh");
    expect(screen.getByTestId("household-id").textContent).toBe("null");
  });

  it("ignores invalid /me household IDs so protected routes send users to onboarding", async () => {
    localStorage.setItem("tb-auth-token", "tok");

    vi.stubGlobal(
      "fetch",
      vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            account_id: "acct-stale",
            household_id: "smith",
            member_id: null,
            role: "",
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => [],
        }),
    );

    render(
      <AuthProvider>
        <AuthDisplay />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("status").textContent).toBe("authenticated");
    });
    expect(screen.getByTestId("household-id").textContent).toBe("null");
  });

  it("uses the account's real household list when /me has no usable household ID", async () => {
    localStorage.setItem("tb-auth-token", "tok");

    vi.stubGlobal(
      "fetch",
      vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            account_id: "acct-real",
            household_id: "undefined",
            member_id: "mem-real",
            role: "adult",
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => [{ id: HOUSEHOLD_ID, name: "Wohlgemuth household" }],
        }),
    );

    render(
      <AuthProvider>
        <AuthDisplay />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("status").textContent).toBe("authenticated");
    });
    expect(screen.getByTestId("household-id").textContent).toBe(HOUSEHOLD_ID);
  });
});

// ── acceptToken ─────────────────────────────────────────────────────────────
// Replaces the old register / login tests. acceptToken() is the entry point
// the /auth/callback page uses after the OIDC code exchange returns an
// id_token. Token gets persisted, /me hydrates the account.

describe("acceptToken()", () => {
  it("stores the id_token and hydrates account context", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          account_id: "acct-cog",
          household_id: COGNITO_HOUSEHOLD_ID,
          member_id: "mem-cog",
          role: "adult",
        }),
      }),
    );

    render(
      <AuthProvider>
        <AuthDisplay />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("status").textContent).toBe("unauthenticated");
    });

    await act(async () => {
      screen.getByText("accept").click();
    });

    await waitFor(() => {
      expect(screen.getByTestId("status").textContent).toBe("authenticated");
    });
    expect(screen.getByTestId("token").textContent).toBe("test-id-token");
    expect(localStorage.getItem("tb-auth-token")).toBe("test-id-token");
    expect(screen.getByTestId("household-id").textContent).toBe(COGNITO_HOUSEHOLD_ID);
  });
});

// ── pinLogin ───────────────────────────────────────────────────────────────

describe("pinLogin()", () => {
  it("calls POST /v1/auth/pin, stores token, sets authenticated", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ token: "pin-token", member_id: "mem-kid" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            account_id: "acct-1",
            household_id: HOUSEHOLD_ID,
            member_id: "mem-kid",
            role: "child",
          }),
        }),
    );

    function PinDisplay() {
      const auth = useAuth();
      return (
        <div>
          <span data-testid="pin-status">{auth.status}</span>
          <span data-testid="pin-token">{auth.token ?? "null"}</span>
          <button onClick={() => auth.pinLogin("mem-kid", "1234").catch(() => {})}>pin</button>
        </div>
      );
    }

    render(
      <AuthProvider>
        <PinDisplay />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("pin-status").textContent).toBe("unauthenticated");
    });

    await act(async () => {
      screen.getByText("pin").click();
    });

    await waitFor(() => {
      expect(screen.getByTestId("pin-status").textContent).toBe("authenticated");
    });
    expect(screen.getByTestId("pin-token").textContent).toBe("pin-token");
    expect(localStorage.getItem("tb-auth-token")).toBe("pin-token");
  });
});

// ── logout ─────────────────────────────────────────────────────────────────

describe("logout()", () => {
  it("clears token + state and triggers Cognito /logout redirect", async () => {
    localStorage.setItem("tb-auth-token", "tok");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          account_id: "acct-1",
          household_id: HOUSEHOLD_ID,
          member_id: null,
          role: "adult",
        }),
      }),
    );

    render(
      <AuthProvider>
        <AuthDisplay />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("status").textContent).toBe("authenticated");
    });

    act(() => {
      screen.getByText("logout").click();
    });

    expect(screen.getByTestId("status").textContent).toBe("unauthenticated");
    expect(screen.getByTestId("token").textContent).toBe("null");
    expect(localStorage.getItem("tb-auth-token")).toBeNull();
  });
});

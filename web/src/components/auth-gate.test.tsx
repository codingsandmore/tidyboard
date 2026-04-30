import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { AuthGate } from "./auth-gate";
import { AuthProvider } from "@/lib/auth/auth-store";

// ── Shared router mock ──────────────────────────────────────────────────────
// Override setup.tsx's per-call mock so all useRouter() calls share one push fn.

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    replace: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
  notFound: vi.fn(),
}));

// ── Helpers ────────────────────────────────────────────────────────────────

function makeLocalStorageMock() {
  const store: Record<string, string> = {};
  return {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
    clear: () => { for (const k in store) delete store[k]; },
  };
}

function renderGate(children = <span>protected content</span>) {
  return render(
    <AuthProvider>
      <AuthGate>{children}</AuthGate>
    </AuthProvider>
  );
}

// ── Setup / teardown ───────────────────────────────────────────────────────

beforeEach(() => {
  vi.stubGlobal("localStorage", makeLocalStorageMock());
  pushMock.mockClear();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// ── Tests ──────────────────────────────────────────────────────────────────

describe("AuthGate", () => {
  it("shows loading state initially", () => {
    // Protected content must never be shown before auth resolves.
    renderGate();
    expect(screen.queryByText("protected content")).toBeNull();
  });

  it("redirects to /login when unauthenticated", async () => {
    // No stored token → resolves to unauthenticated → router.push("/login")
    renderGate();

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/login");
    });
  });

  it("renders children when authenticated", async () => {
    // Store a valid token and mock /me to return a valid user
    localStorage.setItem("tb-auth-token", "valid-token");

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          account_id: "acct-1",
          household_id: "hh-1",
          member_id: "member-1",
          role: "adult",
        }),
      })
    );

    renderGate(<span>protected content</span>);

    await waitFor(() => {
      expect(screen.getByText("protected content")).toBeTruthy();
    });
  });

  it("redirects authenticated accounts without household onboarding to /onboarding", async () => {
    localStorage.setItem("tb-auth-token", "valid-token");

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          account_id: "acct-1",
          household_id: null,
          member_id: null,
          role: "adult",
        }),
      })
    );

    renderGate(<span>protected content</span>);

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/onboarding");
    });
    expect(screen.queryByText("protected content")).toBeNull();
  });

  it("redirects authenticated household accounts without a member profile by default", async () => {
    localStorage.setItem("tb-auth-token", "valid-token");

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          account_id: "acct-1",
          household_id: "hh-1",
          member_id: null,
          role: "adult",
        }),
      })
    );

    renderGate(<span>protected content</span>);

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/onboarding");
    });
    expect(screen.queryByText("protected content")).toBeNull();
  });

  it("can allow authenticated household accounts through without a member profile when requested", async () => {
    localStorage.setItem("tb-auth-token", "valid-token");

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          account_id: "acct-1",
          household_id: "hh-1",
          member_id: null,
          role: "adult",
        }),
      })
    );

    render(
      <AuthProvider>
        <AuthGate requireMemberProfile={false}>
          <span>member chooser content</span>
        </AuthGate>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("member chooser content")).toBeTruthy();
    });
    expect(pushMock).not.toHaveBeenCalledWith("/onboarding");
  });

  it("can allow authenticated accounts through before onboarding when requested", async () => {
    localStorage.setItem("tb-auth-token", "valid-token");

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          account_id: "acct-1",
          household_id: null,
          member_id: null,
          role: "adult",
        }),
      })
    );

    render(
      <AuthProvider>
        <AuthGate requireOnboarding={false}>
          <span>onboarding content</span>
        </AuthGate>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("onboarding content")).toBeTruthy();
    });
  });

  it("does not authenticate as a demo family when fallback API mode is enabled", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "");

    renderGate(<span>protected content</span>);

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/login");
    });
    expect(screen.queryByText("protected content")).toBeNull();
  });

  it("shows loading skeleton while status is loading", () => {
    // Block fetch so status stays 'loading'
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(() => new Promise(() => {})) // never resolves
    );
    localStorage.setItem("tb-auth-token", "tok");

    renderGate();

    // During loading, protected content is not shown
    expect(screen.queryByText("protected content")).toBeNull();
    // Loading text is rendered
    expect(screen.getByText("Loading…")).toBeTruthy();
  });
});

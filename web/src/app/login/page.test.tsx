import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import LoginPage from "./page";
import { AuthProvider } from "@/lib/auth/auth-store";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// ── Shared router mock ──────────────────────────────────────────────────────
// We override the module-level mock from setup.tsx so all useRouter() calls
// within this test file return the same object (and thus the same push fn).

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

function renderLoginPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <AuthProvider>
        <LoginPage />
      </AuthProvider>
    </QueryClientProvider>
  );
}

// ── Setup / teardown ───────────────────────────────────────────────────────

beforeEach(() => {
  vi.stubGlobal("localStorage", makeLocalStorageMock());
  pushMock.mockClear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// ── Tests ──────────────────────────────────────────────────────────────────

describe("LoginPage", () => {
  it("renders email and password fields and a submit button", () => {
    renderLoginPage();
    expect(screen.getByLabelText("Email")).toBeTruthy();
    expect(screen.getByLabelText("Password")).toBeTruthy();
    expect(screen.getByRole("button", { name: /log in/i })).toBeTruthy();
  });

  it("renders a link to /onboarding", () => {
    renderLoginPage();
    const link = screen.getByRole("link", { name: /create one/i });
    expect(link).toBeTruthy();
    expect((link as HTMLAnchorElement).href).toContain("/onboarding");
  });

  it("shows error card when login fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        json: async () => ({ code: "INVALID_CREDENTIALS", message: "Wrong email or password", status: 401 }),
      })
    );

    renderLoginPage();

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "bad@test.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "wrongpw" } });
    fireEvent.click(screen.getByRole("button", { name: /log in/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeTruthy();
    });
    expect(screen.getByRole("alert").textContent).toContain("Wrong email or password");
  });

  it("redirects to / on successful login", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn()
        // login
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ token: "tok", account_id: "a1" }),
        })
        // /me
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ account_id: "a1", household_id: null, member_id: null, role: "adult" }),
        })
    );

    renderLoginPage();

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "a@b.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "pw" } });
    fireEvent.click(screen.getByRole("button", { name: /log in/i }));

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/");
    });
  });
});

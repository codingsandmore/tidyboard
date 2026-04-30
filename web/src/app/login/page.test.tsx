import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import LoginPage from "./page";
import { AuthProvider } from "@/lib/auth/auth-store";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// ── Mocks ───────────────────────────────────────────────────────────────────

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

function renderLoginPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <AuthProvider>
        <LoginPage />
      </AuthProvider>
    </QueryClientProvider>,
  );
}

// ── Setup / teardown ───────────────────────────────────────────────────────

beforeEach(() => {
  vi.stubGlobal("localStorage", makeLocalStorageMock());
  pushMock.mockClear();
  // Stub window.location.assign so signIn() doesn't blow up on navigation.
  if (typeof window !== "undefined" && window.location) {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...window.location, assign: vi.fn(), replace: vi.fn(), origin: "http://localhost" },
    });
  }
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// ── Tests ──────────────────────────────────────────────────────────────────

describe("LoginPage", () => {
  it("renders a single Continue button (no email/password fields after Cognito cutover)", () => {
    renderLoginPage();
    // No password input — Cognito Hosted UI handles passwords.
    expect(screen.queryByLabelText("Password")).toBeNull();
    expect(screen.queryByLabelText("Email")).toBeNull();
    expect(screen.getByRole("button", { name: /log in/i })).toBeTruthy();
  });

  it("renders a link to the kiosk PIN login", () => {
    renderLoginPage();
    const link = screen.getByRole("link", { name: /kiosk pin/i });
    expect(link).toBeTruthy();
    expect((link as HTMLAnchorElement).href).toContain("/pin-login");
  });

  it("shows the explanatory hint about secure sign-in", () => {
    renderLoginPage();
    expect(
      screen.getByText(/secure sign-in page/i),
    ).toBeTruthy();
  });

  it("clicking the button kicks off the OIDC redirect (or surfaces a config error if env missing)", async () => {
    renderLoginPage();
    fireEvent.click(screen.getByRole("button", { name: /log in/i }));

    // In the test environment NEXT_PUBLIC_COGNITO_* are not set, so signIn()
    // throws "Cognito not configured" — the page renders that error inline.
    // We assert we either redirected (window.location.assign was called) OR
    // the error path triggered. Both prove the click handler is wired.
    await waitFor(() => {
      const assigned = (window.location.assign as ReturnType<typeof vi.fn>).mock.calls.length > 0;
      const errorShown = !!screen.queryByRole("alert");
      expect(assigned || errorShown).toBe(true);
    });
  });
});

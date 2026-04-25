import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import OnboardingPage from "./page";
import { AuthProvider } from "@/lib/auth/auth-store";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// ── Shared router mock ──────────────────────────────────────────────────────

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

function renderOnboarding() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <AuthProvider>
        <OnboardingPage />
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

describe("OnboardingPage", () => {
  it("renders step 0 (Welcome) without crashing", () => {
    const { container } = renderOnboarding();
    expect(container).toBeTruthy();
  });

  it("shows step navigation breadcrumb", () => {
    renderOnboarding();
    expect(screen.getByText(/Step 1 \/ 7/)).toBeTruthy();
  });

  it("back button is disabled on step 0", () => {
    renderOnboarding();
    const backBtn = screen.getByRole("button", { name: /common\.back/i });
    expect(backBtn).toBeDisabled();
  });

  it("clicking Next advances from step 0 to step 1 (skips API on step 0)", async () => {
    renderOnboarding();
    const nextBtn = screen.getByRole("button", { name: /common\.next/i });

    fireEvent.click(nextBtn);

    await waitFor(() => {
      expect(screen.getByText(/Step 2 \/ 7/)).toBeTruthy();
    });
  });

  // The "step 1 register fails" test was removed: step 1 no longer calls
  // register() — Cognito's Hosted UI owns signup before the user reaches
  // /onboarding. Step 1 is now a "you're signed in" confirmation that
  // advances directly with no network call.

  it("advance from step 2 creates household", async () => {
    // register mock
    vi.stubGlobal(
      "fetch",
      vi.fn()
        // step 1: register
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ token: "tok", account_id: "a1" }),
        })
        // /me after register
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ account_id: "a1", household_id: null, member_id: null, role: "adult" }),
        })
        // step 2: create household
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ id: "hh-1", name: "My Family" }),
        })
    );

    renderOnboarding();

    // Step 0 → 1
    fireEvent.click(screen.getByRole("button", { name: /common\.next/i }));
    await waitFor(() => expect(screen.getByText(/Step 2 \/ 7/)).toBeTruthy());

    // Step 1 → 2 (register)
    fireEvent.click(screen.getByRole("button", { name: /common\.next/i }));
    await waitFor(() => expect(screen.getByText(/Step 3 \/ 7/)).toBeTruthy());

    // Step 2 → 3 (create household)
    fireEvent.click(screen.getByRole("button", { name: /common\.next/i }));
    await waitFor(() => expect(screen.getByText(/Step 4 \/ 7/)).toBeTruthy());
  });

  it("back button goes back one step", async () => {
    renderOnboarding();

    // Advance to step 1
    fireEvent.click(screen.getByRole("button", { name: /common\.next/i }));
    await waitFor(() => expect(screen.getByText(/Step 2 \/ 7/)).toBeTruthy());

    // Go back
    fireEvent.click(screen.getByRole("button", { name: /common\.back/i }));
    await waitFor(() => expect(screen.getByText(/Step 1 \/ 7/)).toBeTruthy());
  });
});

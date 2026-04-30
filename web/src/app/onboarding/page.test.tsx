import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import OnboardingPage from "./page";
import { AuthProvider } from "@/lib/auth/auth-store";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// ── Auth mock (used by specific tests) ────────────────────────────────────
// Hoisted so vi.mock() can reference it before module evaluation.
const mockUseAuth = vi.fn();
vi.mock("@/lib/auth/auth-store", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/lib/auth/auth-store")>();
  return {
    ...mod,
    useAuth: () => mockUseAuth(),
  };
});

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
  // Default: loading state — existing tests that don't care about account
  // get a neutral auth context that doesn't redirect.
  mockUseAuth.mockReturnValue({
    status: "loading",
    account: null,
    household: null,
    member: null,
    token: null,
    signIn: vi.fn(),
    acceptToken: vi.fn(),
    pinLogin: vi.fn(),
    logout: vi.fn(),
  });
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

    fireEvent.change(screen.getByPlaceholderText("e.g. Our household"), {
      target: { value: "My Family" },
    });

    // Step 2 → 3 (create household)
    fireEvent.click(screen.getByRole("button", { name: /common\.next/i }));
    await waitFor(() => expect(screen.getByText(/Step 4 \/ 7/)).toBeTruthy());
  });

  it("step 3 add-self request body includes account_id from auth context", async () => {
    // Arrange: authenticated user with a known account id.
    mockUseAuth.mockReturnValue({
      status: "authenticated",
      account: { id: "acct-uuid-123", email: "user@test.com" },
      household: null,
      member: null,
      token: "tok",
      signIn: vi.fn(),
      acceptToken: vi.fn(),
      pinLogin: vi.fn(),
      logout: vi.fn(),
    });

    const capturedBodies: unknown[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
        const body = init?.body ? JSON.parse(init.body as string) : null;
        capturedBodies.push({ url, body });
        return {
          ok: true,
          status: 201,
          json: async () => ({ id: "hh-1", name: "My Family", member_id: "m-1" }),
        };
      })
    );

    renderOnboarding();

    // Step 0 → 1
    fireEvent.click(screen.getByRole("button", { name: /common\.next/i }));
    await waitFor(() => expect(screen.getByText(/Step 2 \/ 7/)).toBeTruthy());

    // Step 1 → 2 (no API call on step 1)
    fireEvent.click(screen.getByRole("button", { name: /common\.next/i }));
    await waitFor(() => expect(screen.getByText(/Step 3 \/ 7/)).toBeTruthy());

    fireEvent.change(screen.getByPlaceholderText("e.g. Our household"), {
      target: { value: "My Family" },
    });

    // Step 2 → 3 (creates household)
    fireEvent.click(screen.getByRole("button", { name: /common\.next/i }));
    await waitFor(() => expect(screen.getByText(/Step 4 \/ 7/)).toBeTruthy());

    fireEvent.change(screen.getByPlaceholderText("Your full name"), {
      target: { value: "Alice Parent" },
    });

    // Step 3 → 4 (add self as member)
    fireEvent.click(screen.getByRole("button", { name: /common\.next/i }));
    await waitFor(() => expect(screen.getByText(/Step 5 \/ 7/)).toBeTruthy());

    // Find the member-create call (POST to /members)
    const memberCall = capturedBodies.find(
      (c) => typeof (c as { url: string }).url === "string" && (c as { url: string }).url.includes("/members")
    ) as { url: string; body: Record<string, unknown> } | undefined;

    expect(memberCall).toBeTruthy();
    expect(memberCall?.body?.account_id).toBe("acct-uuid-123");
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

  it("typed household name is sent verbatim in POST body — not 'My Family'", async () => {
    const capturedBodies: unknown[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
        const body = init?.body ? JSON.parse(init.body as string) : null;
        capturedBodies.push({ url, body });
        return {
          ok: true,
          status: 201,
          json: async () => ({ id: "hh-typed", name: "The Typers" }),
        };
      })
    );

    renderOnboarding();

    // Step 0 → 1
    fireEvent.click(screen.getByRole("button", { name: /common\.next/i }));
    await waitFor(() => expect(screen.getByText(/Step 2 \/ 7/)).toBeTruthy());

    // Step 1 → 2 (no API call on step 1)
    fireEvent.click(screen.getByRole("button", { name: /common\.next/i }));
    await waitFor(() => expect(screen.getByText(/Step 3 \/ 7/)).toBeTruthy());

    // On step 2 (household name), type a name into the input
    const nameInput = screen.getByPlaceholderText("e.g. Our household");
    fireEvent.change(nameInput, { target: { value: "The Typers" } });

    // Step 2 → 3 (creates household)
    fireEvent.click(screen.getByRole("button", { name: /common\.next/i }));
    await waitFor(() => expect(screen.getByText(/Step 4 \/ 7/)).toBeTruthy());

    // Find the household-create call (POST to /households, not /members)
    const hhCall = capturedBodies.find(
      (c) =>
        typeof (c as { url: string }).url === "string" &&
        (c as { url: string }).url.includes("/households") &&
        !(c as { url: string }).url.includes("/members")
    ) as { url: string; body: Record<string, unknown> } | undefined;

    expect(hhCall).toBeTruthy();
    expect(hhCall?.body?.name).toBe("The Typers");
    expect(hhCall?.body?.name).not.toBe("My Family");
  });

  it("requires household timezone and sends it when creating the household", async () => {
    const capturedBodies: unknown[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
        const body = init?.body ? JSON.parse(init.body as string) : null;
        capturedBodies.push({ url, body });
        return {
          ok: true,
          status: 201,
          json: async () => ({ id: "hh-typed", name: "The Typers", timezone: "America/Los_Angeles" }),
        };
      })
    );

    renderOnboarding();
    fireEvent.click(screen.getByRole("button", { name: /common\.next/i }));
    await waitFor(() => expect(screen.getByText(/Step 2 \/ 7/)).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: /common\.next/i }));
    await waitFor(() => expect(screen.getByText(/Step 3 \/ 7/)).toBeTruthy());

    fireEvent.change(screen.getByPlaceholderText("e.g. Our household"), {
      target: { value: "The Typers" },
    });
    fireEvent.change(screen.getByLabelText("Household timezone"), {
      target: { value: "America/Los_Angeles" },
    });

    fireEvent.click(screen.getByRole("button", { name: /common\.next/i }));
    await waitFor(() => expect(screen.getByText(/Step 4 \/ 7/)).toBeTruthy());

    const hhCall = capturedBodies.find(
      (c) =>
        typeof (c as { url: string }).url === "string" &&
        (c as { url: string }).url.includes("/households") &&
        !(c as { url: string }).url.includes("/members")
    ) as { url: string; body: Record<string, unknown> } | undefined;

    expect(hhCall?.body?.timezone).toBe("America/Los_Angeles");
  });

  it("adds family adults, children, and pets as real member requests", async () => {
    mockUseAuth.mockReturnValue({
      status: "authenticated",
      account: { id: "acct-uuid-123", email: "user@test.com" },
      household: null,
      member: null,
      token: "tok",
      signIn: vi.fn(),
      acceptToken: vi.fn(),
      pinLogin: vi.fn(),
      logout: vi.fn(),
    });

    const capturedBodies: unknown[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
        const body = init?.body ? JSON.parse(init.body as string) : null;
        capturedBodies.push({ url, body });
        if (typeof url === "string" && url.includes("/households") && !url.includes("/members")) {
          return { ok: true, status: 201, json: async () => ({ id: "hh-1", name: "Real Household" }) };
        }
        return { ok: true, status: 201, json: async () => ({ id: `member-${capturedBodies.length}` }) };
      })
    );

    renderOnboarding();
    fireEvent.click(screen.getByRole("button", { name: /common\.next/i }));
    await waitFor(() => expect(screen.getByText(/Step 2 \/ 7/)).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: /common\.next/i }));
    await waitFor(() => expect(screen.getByText(/Step 3 \/ 7/)).toBeTruthy());
    fireEvent.change(screen.getByPlaceholderText("e.g. Our household"), {
      target: { value: "Real Household" },
    });
    fireEvent.click(screen.getByRole("button", { name: /common\.next/i }));
    await waitFor(() => expect(screen.getByText(/Step 4 \/ 7/)).toBeTruthy());
    fireEvent.change(screen.getByPlaceholderText("Your full name"), {
      target: { value: "Jordan Parent" },
    });
    fireEvent.click(screen.getByRole("button", { name: /common\.next/i }));
    await waitFor(() => expect(screen.getByText(/Step 5 \/ 7/)).toBeTruthy());

    fireEvent.change(screen.getByLabelText("Family member name"), {
      target: { value: "Avery" },
    });
    fireEvent.change(screen.getByLabelText("Family member role"), {
      target: { value: "child" },
    });
    fireEvent.change(screen.getByLabelText("Optional child PIN"), {
      target: { value: "2468" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add family member" }));

    fireEvent.change(screen.getByLabelText("Family member name"), {
      target: { value: "Scout" },
    });
    fireEvent.change(screen.getByLabelText("Family member role"), {
      target: { value: "pet" },
    });
    expect(screen.queryByLabelText("Optional child PIN")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Add family member" }));

    fireEvent.click(screen.getByLabelText("My roster includes everyone who should appear on Tidyboard."));
    fireEvent.click(screen.getByRole("button", { name: /common\.next/i }));
    await waitFor(() => expect(screen.getByText(/Step 6 \/ 7/)).toBeTruthy());

    const memberBodies = capturedBodies
      .filter((c) => typeof (c as { url: string }).url === "string" && (c as { url: string }).url.includes("/members"))
      .map((c) => (c as { body: Record<string, unknown> }).body);

    expect(memberBodies).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "Jordan Parent", role: "admin", age_group: "adult", account_id: "acct-uuid-123" }),
        expect.objectContaining({ name: "Avery", role: "child", age_group: "child", pin: "2468" }),
        expect.objectContaining({ name: "Scout", role: "pet", age_group: "pet" }),
      ])
    );
    expect(memberBodies.find((body) => body.name === "Scout")).not.toHaveProperty("pin");
  });
});

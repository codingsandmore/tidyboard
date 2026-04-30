import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import KioskPage from "./page";
import { AuthProvider } from "@/lib/auth/auth-store";

// ── Router mock ────────────────────────────────────────────────────────────

const pushMock = vi.fn();
const searchParamsState = vi.hoisted(() => ({ value: "" }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    replace: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => "/kiosk",
  useSearchParams: () => new URLSearchParams(searchParamsState.value),
  notFound: vi.fn(),
}));

// ── i18n mock ──────────────────────────────────────────────────────────────

vi.mock("next-intl", () => ({
  useTranslations: (ns: string) => (key: string) => {
    const msgs: Record<string, Record<string, string>> = {
      lock: {
        tapToUnlock: "Tap to unlock",
        whosUsing: "Who's using Tidyboard?",
        tapAvatar: "Tap your avatar to continue",
        pinRequired: "PIN required",
        enterPassword: "Enter password",
      },
    };
    return msgs[ns]?.[key] ?? key;
  },
}));

// ── API + Auth mocks ───────────────────────────────────────────────────────

const pinLoginMock = vi.fn();
const setActiveMemberMock = vi.fn();

const MOCK_MEMBERS = [
  {
    id: "m1",
    name: "Sarah",
    full: "Sarah Smith",
    role: "adult",
    color: "#EF4444",
    initial: "S",
    stars: 0,
    streak: 0,
  },
  {
    id: "m2",
    name: "Jackson",
    full: "Jackson Smith",
    role: "child",
    color: "#22C55E",
    initial: "J",
    stars: 5,
    streak: 3,
  },
  {
    id: "m3",
    name: "Scout",
    full: "Scout",
    role: "pet",
    color: "#8B5CF6",
    initial: "S",
    stars: 0,
    streak: 0,
  },
];

vi.mock("@/lib/api/hooks", () => ({
  useMembers: () => ({ data: MOCK_MEMBERS, isLoading: false }),
}));

vi.mock("@/lib/auth/auth-store", () => ({
  useAuth: () => ({
    pinLogin: pinLoginMock,
    setActiveMember: setActiveMemberMock,
    status: "authenticated",
    member: { id: "m1", name: "Sarah", role: "adult" },
    activeMember: null,
    lockKiosk: vi.fn(),
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// ── KioskLock mock (avoids SVG/Icon issues) ────────────────────────────────

vi.mock("@/components/screens/routine", () => ({
  KioskLock: () => <div data-testid="kiosk-lock-visual">Lock Screen</div>,
}));

vi.mock("@/components/ui/icon", () => ({
  Icon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
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

beforeEach(() => {
  vi.stubGlobal("localStorage", makeLocalStorageMock());
  pushMock.mockClear();
  pinLoginMock.mockClear();
  setActiveMemberMock.mockClear();
  searchParamsState.value = "";
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function renderKiosk() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <AuthProvider>
        <KioskPage />
      </AuthProvider>
    </QueryClientProvider>
  );
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("KioskPage", () => {
  it("renders the lock screen by default", () => {
    renderKiosk();
    expect(screen.getByTestId("kiosk-lock-visual")).toBeTruthy();
  });

  it("clicking lock screen shows member picker", () => {
    renderKiosk();
    fireEvent.click(screen.getByTestId("lock-screen"));
    expect(screen.getByTestId("member-picker")).toBeTruthy();
    expect(screen.getByText("Who's using Tidyboard?")).toBeTruthy();
  });

  it("member picker renders a tile for each PIN-eligible member", () => {
    renderKiosk();
    fireEvent.click(screen.getByTestId("lock-screen"));
    expect(screen.getByTestId("member-tile-m1")).toBeTruthy();
    expect(screen.getByTestId("member-tile-m2")).toBeTruthy();
    expect(screen.queryByTestId("member-tile-m3")).toBeNull();
    expect(screen.getByText("Sarah")).toBeTruthy();
    expect(screen.getByText("Jackson")).toBeTruthy();
    expect(screen.queryByText("Scout")).toBeNull();
  });

  it("clicking a member tile opens PIN modal", () => {
    renderKiosk();
    fireEvent.click(screen.getByTestId("lock-screen"));
    fireEvent.click(screen.getByTestId("member-tile-m1"));
    expect(screen.getByTestId("pin-modal")).toBeTruthy();
    expect(screen.getByTestId("pin-form")).toBeTruthy();
  });

  it("PIN submit button is disabled when fewer than 4 digits entered", () => {
    renderKiosk();
    fireEvent.click(screen.getByTestId("lock-screen"));
    fireEvent.click(screen.getByTestId("member-tile-m1"));
    const submitBtn = screen.getByTestId("pin-submit") as HTMLButtonElement;
    expect(submitBtn.disabled).toBe(true);
  });

  it("calls pinLogin with memberId and pin on form submit", async () => {
    pinLoginMock.mockResolvedValue(undefined);
    renderKiosk();
    fireEvent.click(screen.getByTestId("lock-screen"));
    fireEvent.click(screen.getByTestId("member-tile-m1"));

    // Click digits 1 2 3 4
    fireEvent.click(screen.getByText("1"));
    fireEvent.click(screen.getByText("2"));
    fireEvent.click(screen.getByText("3"));
    fireEvent.click(screen.getByText("4"));

    fireEvent.submit(screen.getByTestId("pin-form"));

    await waitFor(() => {
      expect(pinLoginMock).toHaveBeenCalledWith("m1", "1234");
    });
  });

  it("calls setActiveMember after successful pinLogin", async () => {
    pinLoginMock.mockResolvedValue(undefined);
    renderKiosk();
    fireEvent.click(screen.getByTestId("lock-screen"));
    fireEvent.click(screen.getByTestId("member-tile-m1"));

    fireEvent.click(screen.getByText("1"));
    fireEvent.click(screen.getByText("2"));
    fireEvent.click(screen.getByText("3"));
    fireEvent.click(screen.getByText("4"));

    fireEvent.submit(screen.getByTestId("pin-form"));

    await waitFor(() => {
      expect(setActiveMemberMock).toHaveBeenCalledWith(
        expect.objectContaining({ id: "m1" })
      );
    });
  });

  it("shows error and clears PIN on failed pinLogin", async () => {
    pinLoginMock.mockRejectedValue(new Error("wrong PIN"));
    renderKiosk();
    fireEvent.click(screen.getByTestId("lock-screen"));
    fireEvent.click(screen.getByTestId("member-tile-m1"));

    fireEvent.click(screen.getByText("1"));
    fireEvent.click(screen.getByText("2"));
    fireEvent.click(screen.getByText("3"));
    fireEvent.click(screen.getByText("4"));

    fireEvent.submit(screen.getByTestId("pin-form"));

    await waitFor(() => {
      expect(screen.getByText("Incorrect PIN. Please try again.")).toBeTruthy();
    });
  });

  it("Back button from PIN returns to member picker", async () => {
    renderKiosk();
    fireEvent.click(screen.getByTestId("lock-screen"));
    fireEvent.click(screen.getByTestId("member-tile-m1"));
    expect(screen.getByTestId("pin-modal")).toBeTruthy();

    fireEvent.click(screen.getByTestId("pin-back"));
    expect(screen.getByTestId("member-picker")).toBeTruthy();
  });

  it("redirects to / after successful pin unlock", async () => {
    pinLoginMock.mockResolvedValue(undefined);
    renderKiosk();
    fireEvent.click(screen.getByTestId("lock-screen"));
    fireEvent.click(screen.getByTestId("member-tile-m1"));

    fireEvent.click(screen.getByText("1"));
    fireEvent.click(screen.getByText("2"));
    fireEvent.click(screen.getByText("3"));
    fireEvent.click(screen.getByText("4"));

    fireEvent.submit(screen.getByTestId("pin-form"));

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/");
    });
  });

  it("redirects to a safe return target after successful pin unlock", async () => {
    searchParamsState.value = "member=m2&returnTo=%2Fwallet";
    pinLoginMock.mockResolvedValue(undefined);
    renderKiosk();

    fireEvent.click(screen.getByText("1"));
    fireEvent.click(screen.getByText("2"));
    fireEvent.click(screen.getByText("3"));
    fireEvent.click(screen.getByText("4"));
    fireEvent.submit(screen.getByTestId("pin-form"));

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/wallet");
    });
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import SettingsPage from "./page";
import { AuthProvider } from "@/lib/auth/auth-store";

// ── Router mock ────────────────────────────────────────────────────────────

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    replace: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => "/settings",
  useSearchParams: () => new URLSearchParams(),
  notFound: vi.fn(),
}));

// ── Hooks mocks ────────────────────────────────────────────────────────────

const updateSettingsMock = vi.fn();

vi.mock("@/lib/api/hooks", () => ({
  useMembers: () => ({ data: [], isLoading: false }),
  useCreateMember: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateMember: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteMember: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useCalendars: () => ({ data: [], isLoading: false }),
  useAddICalCalendar: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useHousehold: () => ({
    data: {
      id: "hh-1",
      name: "Smith Family",
      timezone: "UTC",
      settings: { kiosk_mode_enabled: false },
      invite_code: "abc",
      created_at: "2026-01-01",
      updated_at: "2026-01-01",
    },
    isLoading: false,
  }),
  useUpdateHouseholdSettings: () => ({
    mutateAsync: updateSettingsMock,
    isPending: false,
  }),
}));

// ── Other mocks ────────────────────────────────────────────────────────────

vi.mock("@/lib/api/use-subscription", () => ({
  useSubscription: () => ({ subscription: null, loading: false }),
}));

vi.mock("@/lib/ws/ws-provider", () => ({
  useWS: () => ({ status: "open" }),
}));

vi.mock("@/lib/api/fallback", () => ({
  isApiFallbackMode: () => false,
}));

vi.mock("@/lib/auth/auth-store", () => ({
  useAuth: () => ({
    household: { id: "hh-1", name: "Smith Family" },
    member: { id: "m1", name: "Sarah", role: "adult" },
    activeMember: { id: "m1", name: "Sarah", role: "adult" },
    status: "authenticated",
    logout: vi.fn(),
    lockKiosk: vi.fn(),
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("next-intl", () => ({
  useTranslations: (ns: string) => (key: string) => {
    const msgs: Record<string, Record<string, string>> = {
      settings: {
        appearance: "Appearance",
        light: "Light",
        dark: "Dark",
        system: "System",
        account: "Account",
        signOut: "Sign out",
        billing: "Billing",
        selfHosted: "Self-hosted",
        noBillingNeeded: "No billing needed",
        manageBilling: "Manage billing",
        upgradeToCloud: "Upgrade to Cloud",
        connection: "Connection",
        liveConnected: "Live: connected",
        reconnecting: "Reconnecting…",
        offlineRefresh: "Offline — refresh",
        language: "Language",
      },
      common: {
        loading: "Loading…",
        home: "← Home",
      },
      "admin.audit": { title: "Audit Log" },
    };
    return msgs[ns]?.[key] ?? key;
  },
}));

vi.mock("@/components/screens/equity", () => ({
  Settings: () => <div data-testid="equity-settings" />,
}));

vi.mock("@/components/theme-provider", () => ({
  useTheme: () => ({ preference: "system", setTheme: vi.fn() }),
}));

vi.mock("@/i18n/provider", () => ({
  LocaleSwitcher: () => <div data-testid="locale-switcher" />,
}));

vi.mock("./ai-section", () => ({
  AISettingsCard: () => <div data-testid="ai-section" />,
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
  updateSettingsMock.mockClear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function renderSettings() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <AuthProvider>
        <SettingsPage />
      </AuthProvider>
    </QueryClientProvider>
  );
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("KioskModeCard", () => {
  it("renders the Kiosk Mode card", () => {
    renderSettings();
    expect(screen.getByText("Kiosk Mode")).toBeTruthy();
  });

  it("renders the toggle button", () => {
    renderSettings();
    expect(screen.getByTestId("kiosk-mode-toggle")).toBeTruthy();
  });

  it("toggle reflects kiosk_mode_enabled=false initially", () => {
    renderSettings();
    const toggle = screen.getByTestId("kiosk-mode-toggle");
    expect(toggle.getAttribute("aria-pressed")).toBe("false");
  });

  it("clicking toggle calls updateSettings with kiosk_mode_enabled=true", async () => {
    updateSettingsMock.mockResolvedValue(undefined);
    renderSettings();

    fireEvent.click(screen.getByTestId("kiosk-mode-toggle"));

    await waitFor(() => {
      expect(updateSettingsMock).toHaveBeenCalledWith(
        expect.objectContaining({
          settings: expect.objectContaining({ kiosk_mode_enabled: true }),
        })
      );
    });
  });

  it("toggle aria-pressed becomes true optimistically after click", async () => {
    updateSettingsMock.mockResolvedValue(undefined);
    renderSettings();

    fireEvent.click(screen.getByTestId("kiosk-mode-toggle"));

    await waitFor(() => {
      const toggle = screen.getByTestId("kiosk-mode-toggle");
      expect(toggle.getAttribute("aria-pressed")).toBe("true");
    });
  });
});

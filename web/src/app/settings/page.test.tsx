import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import SettingsPage from "./page";
import { AuthProvider } from "@/lib/auth/auth-store";

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

beforeEach(() => {
  vi.stubGlobal("localStorage", makeLocalStorageMock());
  pushMock.mockClear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// ── Helpers ────────────────────────────────────────────────────────────────

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

describe("SettingsPage", () => {
  it("renders without crashing", () => {
    const { container } = renderSettings();
    expect(container).toBeTruthy();
  });

  it("renders Sign out button", () => {
    renderSettings();
    expect(screen.getByTestId("logout-button")).toBeTruthy();
  });

  it("calls logout and redirects to /login when Sign out clicked", async () => {
    renderSettings();

    fireEvent.click(screen.getByTestId("logout-button"));

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/login");
    });
    // Token should be cleared
    expect(localStorage.getItem("tb-auth-token")).toBeNull();
  });

  it("renders appearance theme toggle buttons", () => {
    renderSettings();
    expect(screen.getByText("Light")).toBeTruthy();
    expect(screen.getByText("Dark")).toBeTruthy();
    expect(screen.getByText("System")).toBeTruthy();
  });

  it("renders AI & Automations section", () => {
    renderSettings();
    expect(screen.getAllByText(/AI & Automations/i).length).toBeGreaterThan(0);
  });

  it("renders Calendars section", () => {
    renderSettings();
    expect(screen.getAllByText("Calendars").length).toBeGreaterThan(0);
  });

  it("shows Add iCal URL button in Calendars card", () => {
    renderSettings();
    expect(screen.getByText("+ Add iCal URL")).toBeTruthy();
  });

  it("clicking Add iCal URL shows the iCal form", () => {
    renderSettings();
    fireEvent.click(screen.getByText("+ Add iCal URL"));
    expect(screen.getByPlaceholderText("Calendar name")).toBeTruthy();
  });

  it("shows validation error when submitting empty iCal form", async () => {
    renderSettings();
    fireEvent.click(screen.getByText("+ Add iCal URL"));
    fireEvent.submit(screen.getByPlaceholderText("Calendar name").closest("form")!);
    await waitFor(() => {
      expect(screen.getByText("Name and URL are required.")).toBeTruthy();
    });
  });

  it("Cancel button in iCal form hides the form", () => {
    renderSettings();
    fireEvent.click(screen.getByText("+ Add iCal URL"));
    expect(screen.getByPlaceholderText("Calendar name")).toBeTruthy();
    fireEvent.click(screen.getByText("Cancel"));
    expect(screen.queryByPlaceholderText("Calendar name")).toBeNull();
  });

  it("filling and submitting iCal form with valid data calls fetch", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id: "cal-1", name: "My Cal", kind: "ical_url" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    renderSettings();
    fireEvent.click(screen.getByText("+ Add iCal URL"));
    fireEvent.change(screen.getByPlaceholderText("Calendar name"), {
      target: { value: "My Cal" },
    });
    fireEvent.change(screen.getByPlaceholderText("https://example.com/calendar.ics"), {
      target: { value: "https://example.com/calendar.ics" },
    });
    fireEvent.submit(screen.getByPlaceholderText("Calendar name").closest("form")!);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });
  });

  it("shows error when iCal mutation fails", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      json: async () => ({ code: "SERVER_ERROR", message: "Server error", status: 500 }),
    });
    vi.stubGlobal("fetch", fetchMock);

    renderSettings();
    fireEvent.click(screen.getByText("+ Add iCal URL"));
    fireEvent.change(screen.getByPlaceholderText("Calendar name"), {
      target: { value: "My Cal" },
    });
    fireEvent.change(screen.getByPlaceholderText("https://example.com/calendar.ics"), {
      target: { value: "https://example.com/calendar.ics" },
    });
    fireEvent.submit(screen.getByPlaceholderText("Calendar name").closest("form")!);

    await waitFor(() => {
      expect(screen.getByText("Failed to add calendar. Check the URL and try again.")).toBeTruthy();
    });
  });

  it("shows calendars list when fetch returns calendars", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (String(url).includes("calendars")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => [{ id: "c1", name: "Work", kind: "google", provider_id: "g1" }],
        });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({}) });
    });
    vi.stubGlobal("fetch", fetchMock);

    renderSettings();

    await waitFor(() => {
      expect(screen.getByText("Work")).toBeTruthy();
    });
  });
});

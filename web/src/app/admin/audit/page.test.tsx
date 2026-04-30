/**
 * Tests for the Audit Log admin UI.
 *
 * In tests, NEXT_PUBLIC_API_URL defaults to "http://localhost:8080" (not fallback
 * mode). We mock fetch so:
 *   - /v1/auth/me → returns adult member (so AuthGate passes)
 *   - /v1/audit   → returns a proper ListAuditResponse with mock entries
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/lib/auth/auth-store";
import AuditLogRoute, { AuditLogPage } from "./page";
import { AdminGate } from "@/components/admin-gate";

// ── Router mock ───────────────────────────────────────────────────────────────

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

// ── Mock entries used in fetch responses ──────────────────────────────────────

const HOUSEHOLD_ID = "11111111-1111-4111-8111-111111111111";

const MOCK_ENTRIES = [
  {
    id: "a1", account_id: "demo-account", household_id: HOUSEHOLD_ID,
    action: "event.create", target_type: "event", target_id: "evt-001",
    diff: { title: [null, "Soccer practice"] },
    ip_address: "192.168.1.10", user_agent: "Mozilla/5.0",
    created_at: "2026-04-22T14:55:00Z",
  },
  {
    id: "a2", account_id: "demo-account", household_id: HOUSEHOLD_ID,
    action: "list.update", target_type: "list", target_id: "lst-001",
    diff: { name: ["Old list", "Grocery run"] },
    ip_address: "192.168.1.11", user_agent: "Mozilla/5.0 (iPhone)",
    created_at: "2026-04-22T13:30:00Z",
  },
  {
    id: "a3", account_id: "demo-account", household_id: HOUSEHOLD_ID,
    action: "member.delete", target_type: "member", target_id: "mbr-099",
    diff: { name: ["Guest", null] },
    ip_address: "192.168.1.10", user_agent: "Mozilla/5.0",
    created_at: "2026-04-21T10:00:00Z",
  },
];

const ME_RESPONSE = {
  account_id: "demo-account",
  household_id: HOUSEHOLD_ID,
  member_id: "demo-member",
  role: "adult",
};

function makeAuditResponse(entries = MOCK_ENTRIES) {
  return {
    entries,
    total: entries.length,
    limit: 50,
    offset: 0,
  };
}

/**
 * Returns a fetch mock that handles:
 *   - /v1/auth/me → ME_RESPONSE
 *   - /v1/audit   → ListAuditResponse
 */
function makeFetchMock(auditEntries = MOCK_ENTRIES) {
  return vi.fn().mockImplementation((url: string) => {
    if (url.includes("/v1/auth/me")) {
      return Promise.resolve({
        ok: true, status: 200,
        json: async () => ME_RESPONSE,
      });
    }
    if (url.includes("/v1/audit")) {
      return Promise.resolve({
        ok: true, status: 200,
        json: async () => makeAuditResponse(auditEntries),
      });
    }
    // Reject everything else so other hooks fall back to mock data
    return Promise.reject(new Error("Not mocked"));
  });
}

// ── localStorage mock ─────────────────────────────────────────────────────────

function makeLocalStorageMock(withToken = true) {
  const store: Record<string, string> = withToken
    ? { "tb-auth-token": "valid-token" }
    : {};
  return {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
    clear: () => { for (const k in store) delete store[k]; },
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeQC() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function renderAuditPage() {
  const qc = makeQC();
  const result = render(
    <QueryClientProvider client={qc}>
      <AuthProvider>
        <AuditLogPage />
      </AuthProvider>
    </QueryClientProvider>
  );
  return { ...result, qc };
}

function renderRoute() {
  const qc = makeQC();
  const result = render(
    <QueryClientProvider client={qc}>
      <AuthProvider>
        <AuditLogRoute />
      </AuthProvider>
    </QueryClientProvider>
  );
  return { ...result, qc };
}

// ── Setup / teardown ──────────────────────────────────────────────────────────

beforeEach(() => {
  vi.stubGlobal("localStorage", makeLocalStorageMock(true));
  vi.stubGlobal("fetch", makeFetchMock());
  pushMock.mockClear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("AuditLogPage", () => {
  it("renders audit rows from API response", async () => {
    renderAuditPage();

    expect(screen.getByText("Audit log")).toBeTruthy();

    await waitFor(() => {
      const text = document.body.textContent ?? "";
      expect(text).toContain("event.create");
    }, { timeout: 3000 });
  });

  it("shows Export CSV button", async () => {
    renderAuditPage();
    await waitFor(() => {
      expect(screen.getByTestId("export-csv")).toBeTruthy();
    });
  });

  it("CSV export triggers blob URL creation", async () => {
    const createObjectURL = vi.fn(() => "blob:mock-url");
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", { createObjectURL, revokeObjectURL });

    const clickMock = vi.fn();
    const origCreate = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      if (tag === "a") {
        const a = origCreate("a");
        a.click = clickMock;
        return a;
      }
      return origCreate(tag);
    });

    renderAuditPage();

    await waitFor(() => {
      const text = document.body.textContent ?? "";
      expect(text).toContain("event.create");
    }, { timeout: 3000 });

    fireEvent.click(screen.getByTestId("export-csv"));

    expect(createObjectURL).toHaveBeenCalled();
    const blobArg = createObjectURL.mock.calls[0][0] as Blob;
    expect(blobArg).toBeInstanceOf(Blob);
    expect(blobArg.type).toContain("text/csv");
    expect(clickMock).toHaveBeenCalled();
  });

  it("CSV blob contains correct headers and data", async () => {
    let capturedBlob: Blob | null = null;
    const createObjectURL = vi.fn((b: Blob) => { capturedBlob = b; return "blob:x"; });
    vi.stubGlobal("URL", { createObjectURL, revokeObjectURL: vi.fn() });

    const origCreate = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      if (tag === "a") { const a = origCreate("a"); a.click = vi.fn(); return a; }
      return origCreate(tag);
    });

    renderAuditPage();

    await waitFor(() => {
      const text = document.body.textContent ?? "";
      expect(text).toContain("event.create");
    }, { timeout: 3000 });

    fireEvent.click(screen.getByTestId("export-csv"));

    expect(capturedBlob).not.toBeNull();
    const text = await (capturedBlob as unknown as Blob).text();
    expect(text).toContain("id,account_id");
    expect(text).toContain("action");
    expect(text).toContain("created_at");
    expect(text).toContain("event.create");
  });

  it("filter by action refetches with action param in URL", async () => {
    // Track which audit URLs were fetched
    const fetchedUrls: string[] = [];
    vi.stubGlobal("fetch", vi.fn().mockImplementation((url: string) => {
      fetchedUrls.push(url as string);
      if (url.includes("/v1/auth/me")) {
        return Promise.resolve({ ok: true, status: 200, json: async () => ME_RESPONSE });
      }
      if (url.includes("/v1/audit")) {
        const filtered = MOCK_ENTRIES.filter(e =>
          !url.includes("action=") || url.includes(`action=${e.action}`)
        );
        return Promise.resolve({
          ok: true, status: 200,
          json: async () => makeAuditResponse(filtered),
        });
      }
      return Promise.reject(new Error("Not mocked"));
    }));

    renderAuditPage();

    // Wait for initial load
    await waitFor(() => {
      const text = document.body.textContent ?? "";
      expect(text).toContain("event.create");
    }, { timeout: 3000 });

    // Change action filter
    const select = screen.getByRole("combobox", { name: /action/i });
    fireEvent.change(select, { target: { value: "event.create" } });

    // Wait for refetch
    await waitFor(() => {
      const auditCalls = fetchedUrls.filter(u => u.includes("/v1/audit") && u.includes("action="));
      expect(auditCalls.length).toBeGreaterThan(0);
    }, { timeout: 3000 });
  });

  it("search box filters client-side on action text", async () => {
    renderAuditPage();

    await waitFor(() => {
      const text = document.body.textContent ?? "";
      expect(text).toContain("event.create");
    }, { timeout: 3000 });

    const searchInput = screen.getByRole("searchbox");
    fireEvent.change(searchInput, { target: { value: "member" } });

    await waitFor(() => {
      const text = document.body.textContent ?? "";
      expect(text).toContain("member.delete");
    }, { timeout: 3000 });
  });

  it("row expand shows diff JSON", async () => {
    renderAuditPage();

    await waitFor(() => {
      const text = document.body.textContent ?? "";
      expect(text).toContain("event.create");
    }, { timeout: 3000 });

    // In desktop mode (jsdom default width > 700), rows are table rows.
    // Click on first row to expand it
    const rows = document.querySelectorAll("tr[aria-expanded]");
    expect(rows.length).toBeGreaterThan(0);
    fireEvent.click(rows[0]);

    await waitFor(() => {
      const diffs = document.querySelectorAll("[data-testid^='diff-']");
      expect(diffs.length).toBeGreaterThan(0);
    }, { timeout: 3000 });
  });

  it("pagination prev/next buttons render", async () => {
    renderAuditPage();
    await waitFor(() => {
      expect(screen.getByTestId("prev-page")).toBeTruthy();
      expect(screen.getByTestId("next-page")).toBeTruthy();
    });
  });

  it("date range preset buttons are present", async () => {
    renderAuditPage();
    await waitFor(() => {
      expect(screen.getByText("Last hour")).toBeTruthy();
      expect(screen.getByText("Last 24 h")).toBeTruthy();
      expect(screen.getByText("Last 7 days")).toBeTruthy();
      expect(screen.getByText("Last 30 days")).toBeTruthy();
    });
  });

  it("filter dropdowns render with All actions and All target types", async () => {
    renderAuditPage();
    await waitFor(() => {
      expect(screen.getByText("All actions")).toBeTruthy();
      expect(screen.getByText("All target types")).toBeTruthy();
    });
  });
});

describe("AdminGate", () => {
  it("renders children for adult role", async () => {
    const qc = makeQC();
    render(
      <QueryClientProvider client={qc}>
        <AuthProvider>
          <AdminGate>
            <span data-testid="admin-content">admin content</span>
          </AdminGate>
        </AuthProvider>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("admin-content")).toBeTruthy();
    }, { timeout: 3000 });

    expect(screen.queryByText(/admins only/i)).toBeNull();
  });

  it("shows admins-only gate for unauthenticated / child role", async () => {
    // No token → auth status eventually becomes unauthenticated.
    // AdminGate shows nothing during 'loading', then when unauthenticated
    // the component returns null (AuthGate handles redirect).
    // We test the gate UI directly by stubbing auth to return child role.

    // Use fetch that returns child role
    vi.stubGlobal("fetch", vi.fn().mockImplementation((url: string) => {
      if (url.includes("/v1/auth/me")) {
        return Promise.resolve({
          ok: true, status: 200,
          json: async () => ({ ...ME_RESPONSE, role: "child" }),
        });
      }
      return Promise.reject(new Error("Not mocked"));
    }));

    const qc = makeQC();
    render(
      <QueryClientProvider client={qc}>
        <AuthProvider>
          <AdminGate>
            <span data-testid="admin-content">admin content</span>
          </AdminGate>
        </AuthProvider>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/admins only/i)).toBeTruthy();
    }, { timeout: 3000 });

    expect(screen.queryByTestId("admin-content")).toBeNull();
  });
});

describe("AuditLogRoute (with AuthGate + AdminGate)", () => {
  it("renders for authenticated adult user (sees audit log)", async () => {
    renderRoute();

    await waitFor(() => {
      expect(screen.getByText("Audit log")).toBeTruthy();
    }, { timeout: 3000 });
  });
});

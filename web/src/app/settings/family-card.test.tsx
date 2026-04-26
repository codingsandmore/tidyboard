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
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
  notFound: vi.fn(),
}));

// ── API hooks mock ─────────────────────────────────────────────────────────

const createMemberMock = vi.fn();
const updateMemberMock = vi.fn();
const deleteMemberMock = vi.fn();

const MOCK_MEMBERS = [
  {
    id: "m1",
    name: "Sarah Smith",
    display_name: "Sarah",
    color: "#EF4444",
    role: "admin",
    age_group: "adult",
  },
  {
    id: "m2",
    name: "Jackson Smith",
    display_name: "Jackson",
    color: "#22C55E",
    role: "child",
    age_group: "child",
  },
];

vi.mock("@/lib/api/hooks", () => ({
  useMembers: () => ({ data: MOCK_MEMBERS, isLoading: false }),
  useCreateMember: () => ({
    mutateAsync: createMemberMock,
    isPending: false,
  }),
  useUpdateMember: () => ({
    mutateAsync: updateMemberMock,
    isPending: false,
  }),
  useDeleteMember: () => ({
    mutateAsync: deleteMemberMock,
    isPending: false,
  }),
  useCalendars: () => ({ data: [], isLoading: false }),
  useAddICalCalendar: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useHousehold: () => ({
    data: { id: "hh-1", name: "Smith Family", timezone: "UTC", settings: {}, invite_code: "abc", created_at: "", updated_at: "" },
    isLoading: false,
  }),
  useUpdateHouseholdSettings: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateMemberNotify: () => ({ mutateAsync: vi.fn(), mutate: vi.fn(), isPending: false }),
  useTestNotification: () => ({ mutateAsync: vi.fn(), mutate: vi.fn(), isPending: false }),
}));

vi.mock("@/lib/auth/auth-store", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth/auth-store")>();
  return {
    ...actual,
    useAuth: () => ({
      status: "authenticated",
      account: { id: "a1", email: "test@example.com" },
      household: { id: "demo-household", name: "Smith Family" },
      member: { id: "m1", role: "adult", name: "Sarah" },
      token: "test-token",
      signIn: vi.fn(),
      acceptToken: vi.fn(),
      pinLogin: vi.fn(),
      logout: vi.fn(),
    }),
  };
});

// ── localStorage mock ──────────────────────────────────────────────────────

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
  createMemberMock.mockReset();
  updateMemberMock.mockReset();
  deleteMemberMock.mockReset();
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

describe("FamilyCard", () => {
  it("renders Family Members heading", () => {
    renderSettings();
    expect(screen.getByText("Family Members")).toBeTruthy();
  });

  it("lists existing members by display name", () => {
    renderSettings();
    // Members may appear in multiple cards (e.g. FamilyCard + NotificationsCard)
    expect(screen.getAllByText("Sarah").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Jackson").length).toBeGreaterThan(0);
  });

  it("shows role badges for each member", () => {
    renderSettings();
    expect(screen.getByText("admin")).toBeTruthy();
    expect(screen.getByText("child")).toBeTruthy();
  });

  it("shows Add Member button", () => {
    renderSettings();
    expect(screen.getByTestId("add-member-btn")).toBeTruthy();
  });

  it("clicking Add Member shows the form", () => {
    renderSettings();
    fireEvent.click(screen.getByTestId("add-member-btn"));
    expect(screen.getByTestId("member-form")).toBeTruthy();
    expect(screen.getByPlaceholderText("Full name (e.g. Jackson Smith)")).toBeTruthy();
  });

  it("Cancel button hides the form", () => {
    renderSettings();
    fireEvent.click(screen.getByTestId("add-member-btn"));
    expect(screen.getByTestId("member-form")).toBeTruthy();
    fireEvent.click(screen.getByText("Cancel"));
    expect(screen.queryByTestId("member-form")).toBeNull();
  });

  it("shows validation error when name is empty", async () => {
    renderSettings();
    fireEvent.click(screen.getByTestId("add-member-btn"));
    fireEvent.submit(screen.getByTestId("member-form"));
    await waitFor(() => {
      expect(screen.getByText("Name is required.")).toBeTruthy();
    });
  });

  it("shows validation error when display name is empty", async () => {
    renderSettings();
    fireEvent.click(screen.getByTestId("add-member-btn"));
    fireEvent.change(screen.getByPlaceholderText("Full name (e.g. Jackson Smith)"), {
      target: { value: "Emma Smith" },
    });
    // display name left empty
    fireEvent.submit(screen.getByTestId("member-form"));
    await waitFor(() => {
      expect(screen.getByText("Display name is required.")).toBeTruthy();
    });
  });

  it("submitting valid form calls createMember.mutateAsync", async () => {
    createMemberMock.mockResolvedValue({ id: "m3", name: "Emma Smith" });
    renderSettings();
    fireEvent.click(screen.getByTestId("add-member-btn"));
    fireEvent.change(screen.getByPlaceholderText("Full name (e.g. Jackson Smith)"), {
      target: { value: "Emma Smith" },
    });
    fireEvent.change(screen.getByPlaceholderText("Display name (e.g. Jackson)"), {
      target: { value: "Emma" },
    });
    fireEvent.submit(screen.getByTestId("member-form"));
    await waitFor(() => {
      expect(createMemberMock).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Emma Smith", displayName: "Emma" })
      );
    });
  });

  it("form closes after successful create", async () => {
    createMemberMock.mockResolvedValue({ id: "m3" });
    renderSettings();
    fireEvent.click(screen.getByTestId("add-member-btn"));
    fireEvent.change(screen.getByPlaceholderText("Full name (e.g. Jackson Smith)"), {
      target: { value: "Emma Smith" },
    });
    fireEvent.change(screen.getByPlaceholderText("Display name (e.g. Jackson)"), {
      target: { value: "Emma" },
    });
    fireEvent.submit(screen.getByTestId("member-form"));
    await waitFor(() => {
      expect(screen.queryByTestId("member-form")).toBeNull();
    });
  });

  it("shows error message when createMember fails", async () => {
    createMemberMock.mockRejectedValue(new Error("network error"));
    renderSettings();
    fireEvent.click(screen.getByTestId("add-member-btn"));
    fireEvent.change(screen.getByPlaceholderText("Full name (e.g. Jackson Smith)"), {
      target: { value: "Emma Smith" },
    });
    fireEvent.change(screen.getByPlaceholderText("Display name (e.g. Jackson)"), {
      target: { value: "Emma" },
    });
    fireEvent.submit(screen.getByTestId("member-form"));
    await waitFor(() => {
      expect(screen.getByText("Failed to add member.")).toBeTruthy();
    });
  });

  it("Edit button opens form pre-filled with member data", () => {
    renderSettings();
    fireEvent.click(screen.getByTestId("edit-member-m1"));
    expect(screen.getByTestId("member-form")).toBeTruthy();
    expect(
      (screen.getByPlaceholderText("Full name (e.g. Jackson Smith)") as HTMLInputElement).value
    ).toBe("Sarah Smith");
    expect(
      (screen.getByPlaceholderText("Display name (e.g. Jackson)") as HTMLInputElement).value
    ).toBe("Sarah");
  });

  it("editing and submitting calls updateMember.mutateAsync", async () => {
    updateMemberMock.mockResolvedValue({ id: "m1" });
    renderSettings();
    fireEvent.click(screen.getByTestId("edit-member-m1"));
    fireEvent.change(screen.getByPlaceholderText("Full name (e.g. Jackson Smith)"), {
      target: { value: "Sarah Jones" },
    });
    fireEvent.submit(screen.getByTestId("member-form"));
    await waitFor(() => {
      expect(updateMemberMock).toHaveBeenCalledWith(
        expect.objectContaining({ memberId: "m1", name: "Sarah Jones" })
      );
    });
  });

  it("Delete button calls deleteMember.mutateAsync with correct ID", async () => {
    deleteMemberMock.mockResolvedValue(undefined);
    renderSettings();
    fireEvent.click(screen.getByTestId("delete-member-m2"));
    await waitFor(() => {
      expect(deleteMemberMock).toHaveBeenCalledWith(
        expect.objectContaining({ memberId: "m2" })
      );
    });
  });

  it("PIN validation rejects non-numeric PIN", async () => {
    renderSettings();
    fireEvent.click(screen.getByTestId("add-member-btn"));
    fireEvent.change(screen.getByPlaceholderText("Full name (e.g. Jackson Smith)"), {
      target: { value: "Emma Smith" },
    });
    fireEvent.change(screen.getByPlaceholderText("Display name (e.g. Jackson)"), {
      target: { value: "Emma" },
    });
    fireEvent.change(screen.getByPlaceholderText("PIN (4-6 digits, optional)"), {
      target: { value: "abc" },
    });
    fireEvent.submit(screen.getByTestId("member-form"));
    await waitFor(() => {
      expect(screen.getByText("PIN must be 4-6 digits.")).toBeTruthy();
    });
  });
});

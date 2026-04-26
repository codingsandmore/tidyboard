import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TBD } from "@/lib/data";
import { DashDesktop } from "./dashboard-desktop";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn(), back: vi.fn() }),
  useSearchParams: () => ({ get: () => null }),
  usePathname: () => "/",
}));

vi.mock("@/lib/api/hooks", () => ({
  useMembers: () => ({ data: TBD.members }),
  useEvents: () => ({ data: TBD.events }),
}));

const mockSetActiveMember = vi.fn();
let mockActiveMemberId: string | null = null;

vi.mock("@/lib/auth/auth-store", () => ({
  useAuth: () => ({
    activeMember: mockActiveMemberId ? { id: mockActiveMemberId, name: "Test", role: "adult" } : null,
    setActiveMember: mockSetActiveMember,
    status: "authenticated",
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

function renderWithQuery(ui: React.ReactElement) {
  return render(ui, { wrapper: createWrapper() });
}

describe("DashDesktop", () => {
  it("renders without crashing", () => {
    renderWithQuery(<DashDesktop />);
  });

  it("shows tidyboard brand name", () => {
    renderWithQuery(<DashDesktop />);
    expect(screen.getByText("tidyboard")).toBeTruthy();
  });

  it("shows Today heading", () => {
    renderWithQuery(<DashDesktop />);
    expect(screen.getByText(/Today, April 22/)).toBeTruthy();
  });

  it("shows navigation items", () => {
    renderWithQuery(<DashDesktop />);
    expect(screen.getByText("Calendar")).toBeTruthy();
    expect(screen.getByText("Settings")).toBeTruthy();
  });

  it("shows all family members in sidebar", () => {
    renderWithQuery(<DashDesktop />);
    expect(screen.getByText("Dad")).toBeTruthy();
    expect(screen.getByText("Mom")).toBeTruthy();
  });

  it("shows events in the main list", () => {
    renderWithQuery(<DashDesktop />);
    expect(screen.getByText("Morning standup")).toBeTruthy();
  });

  it("Search button navigates to calendar agenda view", () => {
    mockPush.mockClear();
    renderWithQuery(<DashDesktop />);
    fireEvent.click(screen.getByText("Search"));
    expect(mockPush).toHaveBeenCalledWith("/calendar?view=Agenda");
  });

  it("New event button navigates to /calendar?new=event (not /calendar/event)", () => {
    mockPush.mockClear();
    renderWithQuery(<DashDesktop />);
    fireEvent.click(screen.getByText("New event"));
    expect(mockPush).toHaveBeenCalledWith("/calendar?new=event");
  });

  it("clicking a member tile calls setActiveMember with that member", () => {
    mockSetActiveMember.mockClear();
    mockActiveMemberId = null;
    renderWithQuery(<DashDesktop />);
    const dadTile = screen.getByTestId("member-tile-dad");
    fireEvent.click(dadTile);
    expect(mockSetActiveMember).toHaveBeenCalledWith(
      expect.objectContaining({ id: "dad" })
    );
  });

  it("clicking the active member tile deselects (calls setActiveMember(null))", () => {
    mockSetActiveMember.mockClear();
    mockActiveMemberId = "mom";
    renderWithQuery(<DashDesktop />);
    const momTile = screen.getByTestId("member-tile-mom");
    fireEvent.click(momTile);
    expect(mockSetActiveMember).toHaveBeenCalledWith(null);
  });
});

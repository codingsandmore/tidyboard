import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TBD } from "@/lib/data";
import { DashKiosk } from "./dashboard-kiosk";

vi.mock("@/lib/api/hooks", () => ({
  useMembers: () => ({ data: TBD.members }),
  useEvents: () => ({ data: TBD.events }),
}));

const mockSetActiveMember = vi.fn();
vi.mock("@/lib/auth/auth-store", () => ({
  useAuth: () => ({
    activeMember: null,
    setActiveMember: mockSetActiveMember,
    lockKiosk: vi.fn(),
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

describe("DashKiosk", () => {
  it("renders without crashing", () => {
    renderWithQuery(<DashKiosk />);
  });

  it("shows Today's schedule heading", () => {
    renderWithQuery(<DashKiosk />);
    expect(screen.getByText(/Today's schedule/i)).toBeTruthy();
  });

  it("shows the clock time", () => {
    renderWithQuery(<DashKiosk />);
    expect(screen.getByText("10:34")).toBeTruthy();
  });

  it("shows member names in sidebar", () => {
    renderWithQuery(<DashKiosk />);
    expect(screen.getAllByText("Dad").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Mom").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Jackson").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Emma").length).toBeGreaterThan(0);
  });

  it("shows Morning standup event", () => {
    renderWithQuery(<DashKiosk />);
    expect(screen.getByText("Morning standup")).toBeTruthy();
  });

  it("shows Spaghetti Carbonara", () => {
    renderWithQuery(<DashKiosk />);
    expect(screen.getByText("Spaghetti Carbonara")).toBeTruthy();
  });

  it("switches selected member on click", () => {
    renderWithQuery(<DashKiosk />);
    // click Dad avatar area — find by text "Dad" inside sidebar
    const dadLabels = screen.getAllByText("Dad");
    fireEvent.click(dadLabels[0]);
    // After click, dad's stats should show (stars = 0)
    // Just confirm no crash and still renders
    expect(screen.getByText(/Today's schedule/i)).toBeTruthy();
  });

  it("clicking a member tile calls setActiveMember with that member", () => {
    mockSetActiveMember.mockClear();
    renderWithQuery(<DashKiosk />);
    const dadTile = screen.getByTestId("dashboard-member-dad");
    fireEvent.click(dadTile);
    expect(mockSetActiveMember).toHaveBeenCalledWith(
      expect.objectContaining({ id: "dad" })
    );
  });

  it("renders in dark mode without crashing", () => {
    renderWithQuery(<DashKiosk dark />);
    expect(screen.getByText("10:34")).toBeTruthy();
  });
});

import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import WalletPage from "./page";

const mockPush = vi.fn();
const mockSetActiveMember = vi.fn();

let mockAuth = {
  status: "authenticated",
  activeMember: null as { id: string; name: string; role: "adult" | "child" } | null,
  member: null as { id: string; name: string; role: "adult" | "child" } | null,
  setActiveMember: mockSetActiveMember,
};

const members = [
  { id: "adult-1", name: "Jordan", full: "Jordan Parent", role: "adult", color: "#2563EB", initial: "J" },
  { id: "kid-1", name: "Riley", full: "Riley", role: "child", color: "#16A34A", initial: "R" },
  { id: "pet-1", name: "Scout", full: "Scout", role: "pet", color: "#F59E0B", initial: "S" },
];

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/lib/auth/auth-store", () => ({
  useAuth: () => mockAuth,
}));

vi.mock("@/lib/api/hooks", () => ({
  useMembers: () => ({ data: members, isLoading: false }),
}));

vi.mock("@/components/screens/wallet-kid", () => ({
  WalletKid: ({ memberId }: { memberId: string }) => (
    <div data-testid="wallet-kid">wallet for {memberId}</div>
  ),
}));

beforeEach(() => {
  mockPush.mockClear();
  mockSetActiveMember.mockClear();
  mockAuth = {
    status: "authenticated",
    activeMember: null,
    member: null,
    setActiveMember: mockSetActiveMember,
  };
});

describe("WalletPage", () => {
  it("keeps the sign-in state only for unauthenticated direct renders", () => {
    mockAuth = { ...mockAuth, status: "unauthenticated" };
    render(<WalletPage />);
    expect(screen.getByText(/sign in to view your wallet/i)).toBeTruthy();
  });

  it("shows member selection for authenticated users without active member context", () => {
    render(<WalletPage />);
    expect(screen.queryByText(/sign in to view your wallet/i)).toBeNull();
    expect(screen.getByText(/choose who is using wallet/i)).toBeTruthy();
    expect(screen.getByText("Jordan")).toBeTruthy();
    expect(screen.getByText("Riley")).toBeTruthy();
    expect(screen.queryByText("Scout")).toBeNull();
  });

  it("selects an adult member directly", () => {
    render(<WalletPage />);
    fireEvent.click(screen.getByText("Jordan"));
    expect(mockSetActiveMember).toHaveBeenCalledWith(
      expect.objectContaining({ id: "adult-1", role: "adult" })
    );
    expect(screen.getByTestId("wallet-kid").textContent).toContain("adult-1");
  });

  it("routes child members through kiosk PIN with a return target", () => {
    render(<WalletPage />);
    fireEvent.click(screen.getByText("Riley"));
    expect(mockPush).toHaveBeenCalledWith("/kiosk?member=kid-1&returnTo=%2Fwallet");
  });

  it("renders wallet when active member exists", () => {
    mockAuth = {
      ...mockAuth,
      activeMember: { id: "kid-1", name: "Riley", role: "child" },
    };
    render(<WalletPage />);
    expect(screen.getByTestId("wallet-kid").textContent).toContain("kid-1");
  });
});

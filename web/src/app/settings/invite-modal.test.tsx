/**
 * Tests for the InviteModal component.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { InviteModal } from "./invite-modal";

// ── Mock hooks ─────────────────────────────────────────────────────────────
const mockRegenerateMutateAsync = vi.fn();
const mockApproveMutateAsync = vi.fn();
const mockRejectMutateAsync = vi.fn();

vi.mock("@/lib/api/hooks", () => ({
  useHousehold: () => ({
    data: { id: "hh-1", name: "Smith Family", invite_code: "ABCD1234" },
    isLoading: false,
  }),
  useRegenerateInviteCode: () => ({
    mutateAsync: mockRegenerateMutateAsync,
    isPending: false,
  }),
  useJoinRequests: () => ({
    data: [
      { id: "jr-1", household_id: "hh-1", account_id: "acc-abc", status: "pending", requested_at: "2026-04-24T00:00:00Z" },
    ],
    isLoading: false,
  }),
  useApproveJoinRequest: () => ({
    mutateAsync: mockApproveMutateAsync,
    isPending: false,
  }),
  useRejectJoinRequest: () => ({
    mutateAsync: mockRejectMutateAsync,
    isPending: false,
  }),
}));

vi.mock("@/lib/tokens", () => ({
  TB: {
    bg: "#fff",
    bg2: "#f5f5f5",
    surface: "#fff",
    border: "#e0e0e0",
    text: "#111",
    text2: "#555",
    muted: "#999",
    primary: "#3B82F6",
    primaryFg: "#fff",
    destructive: "#ef4444",
    fontBody: "sans-serif",
    r: { md: "6px", lg: "12px" },
  },
}));

describe("InviteModal", () => {
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders invite code and action buttons", () => {
    render(<InviteModal householdId="hh-1" onClose={onClose} />);
    expect(screen.getByTestId("invite-code-display")).toBeTruthy();
    const codeInput = screen.getByTestId("invite-code-display") as HTMLInputElement;
    expect(codeInput.value).toBe("ABCD1234");
    expect(screen.getByTestId("copy-invite-code-btn")).toBeTruthy();
    expect(screen.getByTestId("regenerate-invite-code-btn")).toBeTruthy();
  });

  it("calls regenerate when Regenerate button clicked", async () => {
    mockRegenerateMutateAsync.mockResolvedValue({ invite_code: "XY123456" });
    render(<InviteModal householdId="hh-1" onClose={onClose} />);
    fireEvent.click(screen.getByTestId("regenerate-invite-code-btn"));
    await waitFor(() => {
      expect(mockRegenerateMutateAsync).toHaveBeenCalledWith("hh-1");
    });
  });

  it("renders pending join requests", () => {
    render(<InviteModal householdId="hh-1" onClose={onClose} />);
    expect(screen.getByTestId("join-request-jr-1")).toBeTruthy();
    expect(screen.getByTestId("approve-jr-1")).toBeTruthy();
    expect(screen.getByTestId("reject-jr-1")).toBeTruthy();
  });

  it("calls approve when Approve button clicked", async () => {
    mockApproveMutateAsync.mockResolvedValue({ id: "jr-1", status: "approved" });
    render(<InviteModal householdId="hh-1" onClose={onClose} />);
    fireEvent.click(screen.getByTestId("approve-jr-1"));
    await waitFor(() => {
      expect(mockApproveMutateAsync).toHaveBeenCalledWith({ requestId: "jr-1", householdId: "hh-1" });
    });
  });

  it("calls reject when Reject button clicked", async () => {
    mockRejectMutateAsync.mockResolvedValue({ id: "jr-1", status: "rejected" });
    render(<InviteModal householdId="hh-1" onClose={onClose} />);
    fireEvent.click(screen.getByTestId("reject-jr-1"));
    await waitFor(() => {
      expect(mockRejectMutateAsync).toHaveBeenCalledWith({ requestId: "jr-1", householdId: "hh-1" });
    });
  });

  it("calls onClose when close button clicked", () => {
    render(<InviteModal householdId="hh-1" onClose={onClose} />);
    fireEvent.click(screen.getByLabelText("Close"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

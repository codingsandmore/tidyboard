/**
 * Tests for the /join page.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import JoinPage from "./page";

// ── Mock next/navigation ──────────────────────────────────────────────────
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => new URLSearchParams(),
}));

// ── Mock hooks ─────────────────────────────────────────────────────────────
const mockUseHouseholdByCode = vi.fn();
const mockRequestJoinMutateAsync = vi.fn();
const mockUseRequestJoin = vi.fn();

vi.mock("@/lib/api/hooks", () => ({
  useHouseholdByCode: (code: string) => mockUseHouseholdByCode(code),
  useRequestJoin: () => mockUseRequestJoin(),
}));

// ── Mock tokens ────────────────────────────────────────────────────────────
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
    fontDisplay: "sans-serif",
    r: { md: "6px", lg: "12px" },
  },
}));

describe("JoinPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseHouseholdByCode.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    });
    mockUseRequestJoin.mockReturnValue({
      mutateAsync: mockRequestJoinMutateAsync,
      isPending: false,
    });
  });

  it("renders code input and look-up button", () => {
    render(<JoinPage />);
    expect(screen.getByTestId("invite-code-input")).toBeTruthy();
    expect(screen.getByText(/look up household/i)).toBeTruthy();
  });

  it("disables lookup button when code is less than 8 chars", () => {
    render(<JoinPage />);
    const input = screen.getByTestId("invite-code-input");
    fireEvent.change(input, { target: { value: "ABC" } });
    const btn = screen.getByText(/look up household/i) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it("shows household preview after entering 8-char code", async () => {
    mockUseHouseholdByCode.mockReturnValue({
      data: { household_id: "hh-1", name: "Smith Family", invite_code: "ABCD1234" },
      isLoading: false,
      error: null,
    });

    render(<JoinPage />);
    const input = screen.getByTestId("invite-code-input");
    fireEvent.change(input, { target: { value: "ABCD1234" } });

    const form = input.closest("form")!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByTestId("household-preview-name")).toBeTruthy();
      expect(screen.getByText("Smith Family")).toBeTruthy();
    });
  });

  it("shows 'waiting for approval' state after requesting to join", async () => {
    mockUseHouseholdByCode.mockReturnValue({
      data: { household_id: "hh-1", name: "Smith Family", invite_code: "ABCD1234" },
      isLoading: false,
      error: null,
    });
    mockRequestJoinMutateAsync.mockResolvedValue({
      id: "jr-1",
      status: "pending",
    });

    render(<JoinPage />);
    const input = screen.getByTestId("invite-code-input");
    fireEvent.change(input, { target: { value: "ABCD1234" } });
    fireEvent.submit(input.closest("form")!);

    await waitFor(() => screen.getByTestId("request-join-btn"));
    fireEvent.click(screen.getByTestId("request-join-btn"));

    await waitFor(() => {
      expect(screen.getByText(/request sent/i)).toBeTruthy();
    });
  });

  it("shows error when lookup fails (invalid code)", async () => {
    mockUseHouseholdByCode.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error("not found"),
    });

    render(<JoinPage />);
    const input = screen.getByTestId("invite-code-input");
    fireEvent.change(input, { target: { value: "BADCODE1" } });
    fireEvent.submit(input.closest("form")!);

    await waitFor(() => {
      expect(screen.getByText(/household not found/i)).toBeTruthy();
    });
  });
});

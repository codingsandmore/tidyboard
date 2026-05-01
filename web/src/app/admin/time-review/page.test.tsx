/**
 * Tests for the Admin Time Review page.
 *
 * Mocks the API hooks at the network boundary so we can drive the
 * grouping + edit/delete UI without touching fetch.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TimeReviewPage } from "./page";

const updateMock = vi.fn();
const deleteMock = vi.fn();

vi.mock("@/lib/api/hooks", () => ({
  useMembers: () => ({
    data: [
      { id: "m1", name: "Sarah", color: "#22C55E", role: "child" },
      { id: "m2", name: "Alex", color: "#3B82F6", role: "child" },
    ],
  }),
  useChores: () => ({
    data: [
      { id: "c1", name: "Brush teeth", weight: 1, frequency_kind: "daily", days_of_week: [], auto_approve: true, household_id: "h1", member_id: "m1", archived_at: null, created_at: "", updated_at: "" },
      { id: "c2", name: "Take out trash", weight: 5, frequency_kind: "weekly", days_of_week: [], auto_approve: true, household_id: "h1", member_id: "m2", archived_at: null, created_at: "", updated_at: "" },
    ],
  }),
  useChoreTimeEntries: () => ({
    data: [
      {
        id: "e1",
        chore_id: "c1",
        member_id: "m1",
        started_at: "2026-04-30T12:00:00Z",
        ended_at: "2026-04-30T12:05:00Z",
        duration_seconds: 300,
        note: "morning",
        source: "timer",
        created_at: "2026-04-30T12:05:00Z",
      },
      {
        id: "e2",
        chore_id: "c2",
        member_id: "m2",
        started_at: "2026-04-30T13:00:00Z",
        ended_at: "2026-04-30T13:30:00Z",
        duration_seconds: 1800,
        note: "",
        source: "timer",
        created_at: "2026-04-30T13:30:00Z",
      },
    ],
    isLoading: false,
    error: null,
  }),
  useUpdateTimeEntry: () => ({
    mutate: (vars: unknown, opts?: { onSuccess?: () => void }) => {
      updateMock(vars);
      opts?.onSuccess?.();
    },
  }),
  useDeleteTimeEntry: () => ({ mutate: (vars: unknown) => deleteMock(vars) }),
}));

function renderWithQuery(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe("TimeReviewPage", () => {
  it("renders entries grouped by member", () => {
    renderWithQuery(<TimeReviewPage />);
    expect(screen.getByRole("heading", { name: /Sarah/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Alex/i })).toBeInTheDocument();
    // Sarah's section contains the brush-teeth entry, Alex's contains trash.
    const sarah = screen.getByRole("region", { name: /Entries for Sarah/i });
    expect(within(sarah).getByText("Brush teeth")).toBeInTheDocument();
    const alex = screen.getByRole("region", { name: /Entries for Alex/i });
    expect(within(alex).getByText("Take out trash")).toBeInTheDocument();
  });

  it("formats durations as h/m/s", () => {
    renderWithQuery(<TimeReviewPage />);
    expect(screen.getByText("5m 0s")).toBeInTheDocument();
    expect(screen.getByText("30m 0s")).toBeInTheDocument();
  });

  it("admin can edit duration via Edit → Save", () => {
    updateMock.mockClear();
    renderWithQuery(<TimeReviewPage />);
    fireEvent.click(screen.getByRole("button", { name: /Edit entry e1/i }));
    const minutesInput = screen.getByLabelText(/Duration minutes for e1/i) as HTMLInputElement;
    fireEvent.change(minutesInput, { target: { value: "10" } });
    fireEvent.click(screen.getByRole("button", { name: /^Save$/i }));
    expect(updateMock).toHaveBeenCalledTimes(1);
    expect(updateMock.mock.calls[0][0]).toMatchObject({ id: "e1" });
    // 10 minutes after 12:00:00Z → 12:10:00Z
    expect(updateMock.mock.calls[0][0].endedAt).toContain("12:10:00");
  });

  it("admin can delete an entry (confirm dialog)", () => {
    deleteMock.mockClear();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    renderWithQuery(<TimeReviewPage />);
    fireEvent.click(screen.getByRole("button", { name: /Delete entry e2/i }));
    expect(deleteMock).toHaveBeenCalledTimes(1);
    expect(deleteMock.mock.calls[0][0]).toMatchObject({ id: "e2" });
    confirmSpy.mockRestore();
  });
});

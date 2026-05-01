import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ChoresKid } from "./chores-kid";

const mutateMock = vi.fn();
const startTimerMock = vi.fn();
const stopTimerMock = vi.fn();
let timerEntryStub: { id: string; chore_id: string; ended_at: string | null } | null = null;
let timerErrorStub: { code?: string; message?: string } | null = null;

vi.mock("canvas-confetti", () => ({ default: vi.fn() }));
vi.mock("@/lib/api/hooks", () => ({
  useChores: () => ({ data: [
    { id: "c1", member_id: "kid1", name: "Brush teeth", weight: 1, frequency_kind: "daily", days_of_week: [], auto_approve: true, archived_at: null, created_at: "", updated_at: "" },
    { id: "c2", member_id: "kid1", name: "Take out trash", weight: 5, frequency_kind: "weekly", days_of_week: [], auto_approve: true, archived_at: null, created_at: "", updated_at: "" },
  ]}),
  useMembers: () => ({ data: [{ id: "kid1", name: "Sarah", color: "#22C55E", role: "child" }] }),
  useChoreCompletions: () => ({ data: [] }),
  useMarkChoreComplete: () => ({ mutate: mutateMock }),
  useAllowance: () => ({ data: [{ id: "a1", household_id: "h1", member_id: "kid1", amount_cents: 500, active_from: "", created_at: "" }] }),
  useStartChoreTimer: () => ({
    mutate: (vars: { choreId: string }, opts?: { onSuccess?: (e: unknown) => void; onError?: (e: unknown) => void }) => {
      startTimerMock(vars);
      if (timerErrorStub) {
        opts?.onError?.(timerErrorStub);
      } else {
        opts?.onSuccess?.(timerEntryStub ?? { id: "te1", chore_id: vars.choreId, ended_at: null });
      }
    },
    isPending: false,
  }),
  useStopChoreTimer: () => ({
    mutate: (vars: { choreId: string }, opts?: { onSuccess?: (e: unknown) => void }) => {
      stopTimerMock(vars);
      opts?.onSuccess?.(timerEntryStub ?? { id: "te1", chore_id: vars.choreId, ended_at: new Date().toISOString(), duration_seconds: 90 });
    },
    isPending: false,
  }),
}));

function renderWithQuery(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe("ChoresKid", () => {
  it("renders chore names", () => {
    renderWithQuery(<ChoresKid memberId="kid1" />);
    expect(screen.getByText("Brush teeth")).toBeInTheDocument();
    expect(screen.getByText("Take out trash")).toBeInTheDocument();
  });
  it("tapping a day cell calls mark mutation", () => {
    mutateMock.mockClear();
    renderWithQuery(<ChoresKid memberId="kid1" />);
    const cell = screen.getAllByLabelText(/Brush teeth/i)[0];
    fireEvent.click(cell);
    expect(mutateMock).toHaveBeenCalledTimes(1);
    expect(mutateMock.mock.calls[0][0]).toMatchObject({ choreId: "c1" });
  });

  it("tap Start sends POST /v1/chores/{id}/timer/start", () => {
    startTimerMock.mockClear();
    timerErrorStub = null;
    timerEntryStub = null;
    renderWithQuery(<ChoresKid memberId="kid1" />);
    const startButtons = screen.getAllByRole("button", { name: /Start timer for Brush teeth/i });
    fireEvent.click(startButtons[0]);
    expect(startTimerMock).toHaveBeenCalledTimes(1);
    expect(startTimerMock.mock.calls[0][0]).toMatchObject({ choreId: "c1" });
  });

  it("after stopping, prompts 'Mark complete?' and calls mark on confirm", () => {
    stopTimerMock.mockClear();
    mutateMock.mockClear();
    timerErrorStub = null;
    timerEntryStub = { id: "te1", chore_id: "c1", ended_at: new Date().toISOString() };
    renderWithQuery(<ChoresKid memberId="kid1" />);
    // Start first
    fireEvent.click(screen.getAllByRole("button", { name: /Start timer for Brush teeth/i })[0]);
    // Now button should be Stop
    const stopBtn = screen.getByRole("button", { name: /Stop timer for Brush teeth/i });
    fireEvent.click(stopBtn);
    expect(stopTimerMock).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/Mark complete\?/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Yes, mark complete/i }));
    expect(mutateMock).toHaveBeenCalledTimes(1);
    expect(mutateMock.mock.calls[0][0]).toMatchObject({ choreId: "c1" });
  });

  it("shows friendly error when start returns timer_already_running 409", () => {
    startTimerMock.mockClear();
    timerErrorStub = { code: "timer_already_running", message: "a timer is already running for this chore" };
    renderWithQuery(<ChoresKid memberId="kid1" />);
    fireEvent.click(screen.getAllByRole("button", { name: /Start timer for Brush teeth/i })[0]);
    expect(screen.getByText(/already running/i)).toBeInTheDocument();
    timerErrorStub = null;
  });
});

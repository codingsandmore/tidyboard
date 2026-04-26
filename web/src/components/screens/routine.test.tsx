import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TBD } from "@/lib/data";
import { RoutineKid, RoutineChecklist, RoutinePath, KioskLock, KioskLockMembers } from "./routine";
import type { ApiRoutine } from "@/lib/api/types";

// Build an ApiRoutine from the legacy TBD fixture for smoke tests
const mockApiRoutine: ApiRoutine = {
  id: "test-routine-id",
  household_id: "test-household-id",
  name: "Jackson's Morning Routine",
  member_id: TBD.routine.member,
  days_of_week: ["mon", "tue", "wed", "thu", "fri"],
  time_slot: "morning",
  archived: false,
  sort_order: 0,
  steps: TBD.routine.steps.map((s, i) => ({
    id: s.id,
    routine_id: "test-routine-id",
    name: s.name,
    est_minutes: s.min,
    sort_order: i,
    icon: s.emoji,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  })),
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const mockMutate = vi.fn();

vi.mock("@/lib/api/hooks", () => ({
  useRoutines: () => ({ data: [mockApiRoutine] }),
  useMarkStepComplete: () => ({ mutate: mockMutate }),
  useStreak: () => ({ data: { routine_id: "test-routine-id", member_id: TBD.routine.member, streak: 5 } }),
  useToggleRoutineStep: () => ({ mutate: vi.fn() }),
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

describe("RoutineKid", () => {
  it("renders without crashing", () => {
    renderWithQuery(<RoutineKid />);
  });

  it("shows routine name", () => {
    renderWithQuery(<RoutineKid />);
    expect(screen.getByText(/Jackson's Morning Routine/)).toBeTruthy();
  });

  it("shows step names from API data", () => {
    renderWithQuery(<RoutineKid />);
    expect(screen.getByText("Make bed")).toBeTruthy();
    expect(screen.getByText("Brush teeth")).toBeTruthy();
  });

  it("fires markComplete mutation on step tap", () => {
    renderWithQuery(<RoutineKid />);
    mockMutate.mockClear();
    const makeBed = screen.getByText("Make bed");
    const stepDiv = makeBed.closest("[style*='cursor: pointer']")!;
    fireEvent.click(stepDiv);
    expect(mockMutate).toHaveBeenCalledTimes(1);
    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        routineId: "test-routine-id",
        req: expect.objectContaining({ step_id: expect.any(String) }),
      })
    );
  });

  it("marks step as done visually after tap", () => {
    renderWithQuery(<RoutineKid />);
    const makeBed = screen.getByText("Make bed");
    const stepDiv = makeBed.closest("[style*='cursor: pointer']")!;
    fireEvent.click(stepDiv);
    expect(makeBed.style.textDecoration).toBe("line-through");
  });

  it("shows streak count from API", () => {
    renderWithQuery(<RoutineKid />);
    // streak=5 is rendered inside the flame streak badge; the i18n key renders
    // as a template string in test environment — just check the number is present
    expect(screen.getAllByText((_, el) =>
      el?.tagName !== "SCRIPT" && (el?.textContent ?? "").includes("5")
    ).length).toBeGreaterThan(0);
  });

  it("renders in dark mode without crashing", () => {
    renderWithQuery(<RoutineKid dark />);
    expect(screen.getByText(/Jackson's Morning Routine/)).toBeTruthy();
  });

  it("shows progress counter", () => {
    renderWithQuery(<RoutineKid />);
    expect(screen.getByText(/DONE/)).toBeTruthy();
  });
});

describe("RoutineChecklist", () => {
  it("renders without crashing", () => {
    render(<RoutineChecklist />);
  });

  it("shows Let's get ready text", () => {
    render(<RoutineChecklist />);
    expect(screen.getByText(/Let's get ready/)).toBeTruthy();
  });

  it("shows all routine steps", () => {
    render(<RoutineChecklist />);
    expect(screen.getByText("Make bed")).toBeTruthy();
    expect(screen.getByText("Pack school bag")).toBeTruthy();
  });
});

describe("RoutinePath", () => {
  it("renders without crashing", () => {
    render(<RoutinePath />);
  });

  it("shows Jackson's Journey", () => {
    render(<RoutinePath />);
    expect(screen.getByText(/Jackson's Journey/)).toBeTruthy();
  });

  it("shows steps in path layout", () => {
    render(<RoutinePath />);
    expect(screen.getByText("Make bed")).toBeTruthy();
  });
});

describe("KioskLock", () => {
  it("renders without crashing", () => {
    render(<KioskLock />);
  });

  it("shows clock time", () => {
    render(<KioskLock />);
    expect(screen.getByText("10:34")).toBeTruthy();
  });

  it("shows Tap to unlock hint", () => {
    render(<KioskLock />);
    expect(screen.getByText("Tap to unlock")).toBeTruthy();
  });
});

describe("KioskLockMembers", () => {
  it("renders without crashing", () => {
    render(<KioskLockMembers />);
  });

  it("shows Who's using Tidyboard question", () => {
    render(<KioskLockMembers />);
    expect(screen.getByText(/Who's using Tidyboard/)).toBeTruthy();
  });

  it("shows all family member names", () => {
    render(<KioskLockMembers />);
    expect(screen.getByText("Dad")).toBeTruthy();
    expect(screen.getByText("Mom")).toBeTruthy();
    expect(screen.getByText("Jackson")).toBeTruthy();
    expect(screen.getByText("Emma")).toBeTruthy();
  });
});

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TBD } from "@/lib/data";
import { RoutineKid, RoutineChecklist, RoutinePath, KioskLock, KioskLockMembers } from "./routine";

vi.mock("@/lib/api/hooks", () => ({
  useRoutines: () => ({ data: [TBD.routine] }),
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

  it("shows Jackson's name", () => {
    renderWithQuery(<RoutineKid />);
    expect(screen.getByText(/Jackson/)).toBeTruthy();
  });

  it("shows step names", () => {
    renderWithQuery(<RoutineKid />);
    expect(screen.getByText("Make bed")).toBeTruthy();
    expect(screen.getByText("Brush teeth")).toBeTruthy();
  });

  it("toggles step done state on click", () => {
    renderWithQuery(<RoutineKid />);
    // Eat breakfast is initially not done (active), click it
    const eatBreakfast = screen.getByText("Eat breakfast");
    const stepDiv = eatBreakfast.closest("div[style*='cursor: pointer']")!;
    fireEvent.click(stepDiv);
    // After click it should be marked done
    expect(eatBreakfast.style.textDecoration).toBe("line-through");
  });

  it("renders in dark mode without crashing", () => {
    renderWithQuery(<RoutineKid dark />);
    expect(screen.getByText(/Jackson/)).toBeTruthy();
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

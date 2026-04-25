import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TBD } from "@/lib/data";
import { CalDay, CalWeek, CalMonth, CalAgenda, EventModal } from "./calendar";

// ── Shared mutation mocks ──────────────────────────────────────────────────

const mutateFn = vi.fn();
function mockMutation() {
  return { mutate: mutateFn, isPending: false };
}

vi.mock("@/lib/api/hooks", () => ({
  useMembers: () => ({ data: TBD.members }),
  useEvents: (_range?: unknown) => ({ data: TBD.events }),
  useCreateEvent: () => mockMutation(),
  useUpdateEvent: () => mockMutation(),
  useDeleteEvent: () => mockMutation(),
}));

beforeEach(() => {
  mutateFn.mockReset();
});

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

function renderWithQuery(ui: React.ReactElement) {
  return render(ui, { wrapper: createWrapper() });
}

// ── CalDay ─────────────────────────────────────────────────────────────────

describe("CalDay", () => {
  it("renders without crashing", () => {
    renderWithQuery(<CalDay />);
  });

  it("shows Thursday April 22", () => {
    renderWithQuery(<CalDay />);
    expect(screen.getByText("Thursday, April 22")).toBeTruthy();
  });

  it("shows member columns", () => {
    renderWithQuery(<CalDay />);
    expect(screen.getAllByText("Dad").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Mom").length).toBeGreaterThan(0);
  });

  it("renders dark mode without crashing", () => {
    renderWithQuery(<CalDay dark />);
    expect(screen.getByText("Thursday, April 22")).toBeTruthy();
  });
});

describe("CalDay (tab interaction)", () => {
  it("clicking a view tab does not crash", () => {
    renderWithQuery(<CalDay />);
    const weekBtn = screen.getByText("Week");
    fireEvent.click(weekBtn);
    expect(screen.getByText("Thursday, April 22")).toBeTruthy();
  });
});

// ── CalWeek ────────────────────────────────────────────────────────────────

describe("CalWeek", () => {
  it("renders without crashing", () => {
    render(<CalWeek />);
  });

  it("shows week date range", () => {
    render(<CalWeek />);
    expect(screen.getByText(/Apr 19/)).toBeTruthy();
  });

  it("shows day names", () => {
    render(<CalWeek />);
    expect(screen.getByText("MON")).toBeTruthy();
    expect(screen.getByText("THU")).toBeTruthy();
  });
});

// ── CalMonth ───────────────────────────────────────────────────────────────

describe("CalMonth", () => {
  it("renders without crashing", () => {
    render(<CalMonth />);
  });

  it("shows April 2026 heading", () => {
    render(<CalMonth />);
    expect(screen.getByText("April 2026")).toBeTruthy();
  });

  it("shows day-of-week headers", () => {
    render(<CalMonth />);
    expect(screen.getByText("SUN")).toBeTruthy();
    expect(screen.getByText("SAT")).toBeTruthy();
  });
});

// ── CalAgenda ──────────────────────────────────────────────────────────────

describe("CalAgenda", () => {
  it("renders without crashing", () => {
    renderWithQuery(<CalAgenda />);
  });

  it("shows Agenda heading", () => {
    renderWithQuery(<CalAgenda />);
    expect(screen.getAllByText("Agenda").length).toBeGreaterThan(0);
  });

  it("shows today's label", () => {
    renderWithQuery(<CalAgenda />);
    expect(screen.getByText(/TODAY/)).toBeTruthy();
  });

  it("shows event titles", () => {
    renderWithQuery(<CalAgenda />);
    expect(screen.getByText("Morning standup")).toBeTruthy();
  });
});

// ── EventModal ─────────────────────────────────────────────────────────────

describe("EventModal", () => {
  it("renders without crashing (new event mode)", () => {
    renderWithQuery(<EventModal onClose={vi.fn()} />);
  });

  it("shows title input empty for new event", () => {
    renderWithQuery(<EventModal onClose={vi.fn()} />);
    const input = screen.getByPlaceholderText(/event title/i) as HTMLInputElement;
    expect(input.value).toBe("");
  });

  it("shows Save button", () => {
    renderWithQuery(<EventModal onClose={vi.fn()} />);
    expect(screen.getByText("Save")).toBeTruthy();
  });

  it("shows Cancel button", () => {
    renderWithQuery(<EventModal onClose={vi.fn()} />);
    expect(screen.getByText("Cancel")).toBeTruthy();
  });

  it("Cancel button calls onClose", () => {
    const onClose = vi.fn();
    renderWithQuery(<EventModal onClose={onClose} />);
    fireEvent.click(screen.getByText("Cancel"));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("Save without title shows error, does not call mutate", () => {
    renderWithQuery(<EventModal onClose={vi.fn()} />);
    fireEvent.click(screen.getByText("Save"));
    expect(mutateFn).not.toHaveBeenCalled();
  });

  it("Save with title calls createEvent mutation with correct body", async () => {
    mutateFn.mockImplementation((_vars: unknown, opts?: { onSuccess?: () => void }) => {
      opts?.onSuccess?.();
    });
    const onClose = vi.fn();
    renderWithQuery(<EventModal onClose={onClose} />);

    // Type a title via the Input component (onChange fires with string value)
    const input = screen.getByPlaceholderText(/event title/i);
    fireEvent.change(input, { target: { value: "Soccer practice" } });

    fireEvent.click(screen.getByText("Save"));

    await waitFor(() => {
      expect(mutateFn).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Soccer practice" }),
        expect.any(Object)
      );
    });
    expect(onClose).toHaveBeenCalled();
  });

  it("edit mode shows existing title", () => {
    const event = { id: "evt-1", title: "Dentist", start_time: "2026-04-22T09:00:00Z", end_time: "2026-04-22T10:00:00Z" };
    renderWithQuery(<EventModal event={event} onClose={vi.fn()} />);
    const input = screen.getByDisplayValue("Dentist") as HTMLInputElement;
    expect(input.value).toBe("Dentist");
  });

  it("edit mode shows Delete button", () => {
    const event = { id: "evt-1", title: "Dentist", start_time: "2026-04-22T09:00:00Z", end_time: "2026-04-22T10:00:00Z" };
    renderWithQuery(<EventModal event={event} onClose={vi.fn()} />);
    expect(screen.getByText("Delete")).toBeTruthy();
  });

  it("Delete button in edit mode calls deleteEvent mutation", () => {
    const event = { id: "evt-1", title: "Dentist", start_time: "2026-04-22T09:00:00Z", end_time: "2026-04-22T10:00:00Z" };
    renderWithQuery(<EventModal event={event} onClose={vi.fn()} />);
    fireEvent.click(screen.getByText("Delete"));
    expect(mutateFn).toHaveBeenCalledWith("evt-1", expect.any(Object));
  });
});

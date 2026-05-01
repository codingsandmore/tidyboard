import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TBD } from "@/lib/data";
import type { TBDEvent } from "@/lib/data";
import { CalDay, CalWeek, CalMonth, CalAgenda, EventModal } from "./calendar";

// ── Shared mutation mocks ──────────────────────────────────────────────────

const mutateFn = vi.fn();
let mockEvents: TBDEvent[] = TBD.events;
function mockMutation() {
  return { mutate: mutateFn, isPending: false };
}

vi.mock("@/lib/api/hooks", () => ({
  useMembers: () => ({ data: TBD.members }),
  useEvents: (_range?: unknown) => ({ data: mockEvents }),
  useCreateEvent: () => mockMutation(),
  useUpdateEvent: () => mockMutation(),
  useDeleteEvent: () => mockMutation(),
}));

beforeEach(() => {
  mutateFn.mockReset();
  mockEvents = TBD.events;
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

  it("shows the current weekday in the heading", () => {
    renderWithQuery(<CalDay />);
    // CalDay's heading is rendered from the current Date and is wrapped in
    // a <div data-testid="calendar-day-heading">. We assert on a weekday
    // pattern instead of a hardcoded string so the test stays stable.
    const heading = screen.getByTestId("calendar-day-heading");
    expect(heading.textContent ?? "").toMatch(
      /(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday)/
    );
  });

  it("shows member columns", () => {
    renderWithQuery(<CalDay />);
    expect(screen.getAllByText("Dad").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Mom").length).toBeGreaterThan(0);
  });

  it("renders dark mode without crashing", () => {
    renderWithQuery(<CalDay dark />);
    expect(screen.getByTestId("calendar-day-heading")).toBeTruthy();
  });

  it("Next/Previous day chevrons advance the heading", () => {
    renderWithQuery(<CalDay />);
    const heading = screen.getByTestId("calendar-day-heading");
    const initial = heading.textContent ?? "";
    fireEvent.click(screen.getByTestId("calendar-day-next"));
    expect(heading.textContent).not.toEqual(initial);
    fireEvent.click(screen.getByTestId("calendar-day-prev"));
    expect(heading.textContent).toEqual(initial);
  });

  it("calls onEventOpen with the clicked day event", () => {
    const onEventOpen = vi.fn();
    renderWithQuery(<CalDay onEventOpen={onEventOpen} />);
    fireEvent.click(screen.getByText("Morning standup"));
    expect(onEventOpen).toHaveBeenCalledWith(
      expect.objectContaining({ id: "e1", title: "Morning standup" })
    );
  });
});

describe("CalDay (tab interaction)", () => {
  it("clicking a view tab does not crash", () => {
    renderWithQuery(<CalDay />);
    const weekBtn = screen.getByText("Week");
    fireEvent.click(weekBtn);
    expect(screen.getByTestId("calendar-day-heading")).toBeTruthy();
  });
});

// ── CalWeek ────────────────────────────────────────────────────────────────

describe("CalWeek", () => {
  it("renders without crashing", () => {
    render(<CalWeek />);
  });

  it("shows a week date range with month abbreviation and year", () => {
    render(<CalWeek />);
    const heading = screen.getByTestId("calendar-week-heading");
    expect(heading.textContent ?? "").toMatch(
      /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec).*\d{4}/
    );
  });

  it("Next/Previous week chevrons advance the heading", () => {
    render(<CalWeek />);
    const heading = screen.getByTestId("calendar-week-heading");
    const initial = heading.textContent ?? "";
    fireEvent.click(screen.getByTestId("calendar-week-next"));
    expect(heading.textContent).not.toEqual(initial);
    fireEvent.click(screen.getByTestId("calendar-week-prev"));
    expect(heading.textContent).toEqual(initial);
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
    renderWithQuery(<CalMonth />);
  });

  it("calls onEventOpen with the clicked month event", () => {
    const onEventOpen = vi.fn();
    const now = new Date();
    mockEvents = [
      {
        id: "month-event",
        title: "School conference",
        start: "10:00",
        end: "11:00",
        start_time: new Date(now.getFullYear(), now.getMonth(), 10, 10, 0, 0).toISOString(),
        end_time: new Date(now.getFullYear(), now.getMonth(), 10, 11, 0, 0).toISOString(),
        members: ["dad"],
        location: "Room 12",
      },
    ];
    renderWithQuery(<CalMonth onEventOpen={onEventOpen} />);
    fireEvent.click(screen.getByText("School conference"));
    expect(onEventOpen).toHaveBeenCalledWith(
      expect.objectContaining({ id: "month-event", title: "School conference" })
    );
  });

  it("shows the current month heading dynamically", () => {
    renderWithQuery(<CalMonth />);
    const heading = screen.getByTestId("calendar-month-heading");
    expect(heading.textContent ?? "").toMatch(
      /(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}/
    );
  });

  it("Next/Previous month chevrons advance the heading", () => {
    renderWithQuery(<CalMonth />);
    const heading = screen.getByTestId("calendar-month-heading");
    const initial = heading.textContent ?? "";
    fireEvent.click(screen.getByTestId("calendar-month-next"));
    expect(heading.textContent).not.toEqual(initial);
    fireEvent.click(screen.getByTestId("calendar-month-prev"));
    expect(heading.textContent).toEqual(initial);
  });

  it("shows day-of-week headers", () => {
    renderWithQuery(<CalMonth />);
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

  it("calls onEventOpen with the clicked agenda event", () => {
    const onEventOpen = vi.fn();
    renderWithQuery(<CalAgenda onEventOpen={onEventOpen} />);
    fireEvent.click(screen.getByText("Morning standup"));
    expect(onEventOpen).toHaveBeenCalledWith(
      expect.objectContaining({ id: "e1", title: "Morning standup" })
    );
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

  it("edit mode shows only assigned members as selected", () => {
    const event = {
      id: "evt-1",
      title: "Dentist",
      start_time: "2026-04-22T09:00:00Z",
      end_time: "2026-04-22T10:00:00Z",
      members: ["dad"],
    };
    renderWithQuery(<EventModal event={event} onClose={vi.fn()} />);
    expect(screen.getByTestId("event-member-dad")).toHaveAttribute("data-selected", "true");
    expect(screen.getByTestId("event-member-mom")).toHaveAttribute("data-selected", "false");
  });

  it("updates edit fields when the event payload changes", () => {
    const first = {
      id: "evt-1",
      title: "List title",
      start_time: "2026-04-22T09:00:00Z",
      end_time: "2026-04-22T10:00:00Z",
      location: "Old place",
      description: "Old notes",
      members: ["dad"],
    };
    const updated = {
      ...first,
      title: "Fetched title",
      location: "Real clinic",
      description: "Bring insurance card.",
    };
    const { rerender } = renderWithQuery(<EventModal event={first} onClose={vi.fn()} />);
    rerender(<EventModal event={updated} onClose={vi.fn()} />);
    expect(screen.getByDisplayValue("Fetched title")).toBeTruthy();
    expect(screen.getByDisplayValue("Real clinic")).toBeTruthy();
    expect(screen.getByDisplayValue("Bring insurance card.")).toBeTruthy();
  });

  it("Delete button in edit mode calls deleteEvent mutation", () => {
    const event = { id: "evt-1", title: "Dentist", start_time: "2026-04-22T09:00:00Z", end_time: "2026-04-22T10:00:00Z" };
    renderWithQuery(<EventModal event={event} onClose={vi.fn()} />);
    fireEvent.click(screen.getByText("Delete"));
    expect(mutateFn).toHaveBeenCalledWith("evt-1", expect.any(Object));
  });

  // ── Assignee multi-select (issue #112) ───────────────────────────────────
  it("create form: selecting two members submits assigned_members payload", async () => {
    mutateFn.mockImplementation((_vars: unknown, opts?: { onSuccess?: () => void }) => {
      opts?.onSuccess?.();
    });
    renderWithQuery(<EventModal onClose={vi.fn()} />);

    // Title is required for save to fire the mutation.
    const titleInput = screen.getByPlaceholderText(/event title/i);
    fireEvent.change(titleInput, { target: { value: "Soccer carpool" } });

    // Toggle dad + mom on. The chips are the same testid the read-only
    // preview already used; the new multi-select keeps that contract.
    fireEvent.click(screen.getByTestId("event-member-dad"));
    fireEvent.click(screen.getByTestId("event-member-mom"));

    fireEvent.click(screen.getByText("Save"));

    await waitFor(() => {
      expect(mutateFn).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Soccer carpool",
          assigned_members: ["dad", "mom"],
        }),
        expect.any(Object)
      );
    });
  });

  it("edit form: deselecting the lone assignee submits empty assigned_members", async () => {
    mutateFn.mockImplementation((_vars: unknown, opts?: { onSuccess?: () => void }) => {
      opts?.onSuccess?.();
    });
    const event = {
      id: "evt-1",
      title: "Dentist",
      start_time: "2026-04-22T09:00:00Z",
      end_time: "2026-04-22T10:00:00Z",
      members: ["dad"],
    };
    renderWithQuery(<EventModal event={event} onClose={vi.fn()} />);

    // Dad starts selected; clicking deselects.
    expect(screen.getByTestId("event-member-dad")).toHaveAttribute(
      "data-selected",
      "true"
    );
    fireEvent.click(screen.getByTestId("event-member-dad"));

    fireEvent.click(screen.getByText("Save"));

    await waitFor(() => {
      expect(mutateFn).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "evt-1",
          assigned_members: [],
        }),
        expect.any(Object)
      );
    });
  });
});

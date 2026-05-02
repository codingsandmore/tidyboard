import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { EventDetailSheet } from "./EventDetailSheet";
import type { Member, TBDEvent } from "@/lib/data";

const dad: Member = {
  id: "dad",
  name: "Dad",
  full: "Fred",
  role: "adult",
  color: "#3B82F6",
  initial: "F",
  stars: 0,
  streak: 0,
};

const mom: Member = {
  id: "mom",
  name: "Mom",
  full: "Wilma",
  role: "adult",
  color: "#EC4899",
  initial: "W",
  stars: 0,
  streak: 0,
};

const event: TBDEvent = {
  id: "evt-1",
  title: "Soccer practice",
  start: "16:00",
  end: "17:00",
  start_time: "2026-04-30T16:00:00.000Z",
  end_time: "2026-04-30T17:00:00.000Z",
  members: ["dad", "mom"],
  assigned_members: ["dad", "mom"],
  location: "Lincoln Park",
  description: "Bring cleats and water bottle.",
  recurrence_rule: "FREQ=WEEKLY",
};

describe("EventDetailSheet", () => {
  it("returns null when no event is provided", () => {
    const { container } = render(
      <EventDetailSheet event={null} members={[dad, mom]} onClose={() => {}} />
    );
    // No sheet rendered — the root container is empty.
    expect(container.querySelector('[data-testid="event-detail-sheet"]')).toBeNull();
  });

  it("renders title, time range, location, notes, and recurrence label", () => {
    render(
      <EventDetailSheet event={event} members={[dad, mom]} onClose={() => {}} />
    );
    expect(screen.getByTestId("event-detail-sheet")).toBeTruthy();
    expect(screen.getByText("Soccer practice")).toBeTruthy();
    expect(screen.getByText(/Lincoln Park/)).toBeTruthy();
    expect(screen.getByText(/Bring cleats/)).toBeTruthy();
    // Recurrence is surfaced as a human-readable label.
    expect(screen.getByTestId("event-detail-recurrence").textContent).toMatch(
      /weekly/i
    );
  });

  it("lists all assigned members with their names", () => {
    render(
      <EventDetailSheet event={event} members={[dad, mom]} onClose={() => {}} />
    );
    const memberList = screen.getByTestId("event-detail-members");
    expect(memberList.textContent).toMatch(/Dad/);
    expect(memberList.textContent).toMatch(/Mom/);
  });

  it("renders large touch-friendly action buttons (>=44px tall)", () => {
    render(
      <EventDetailSheet
        event={event}
        members={[dad, mom]}
        onClose={() => {}}
        onEdit={() => {}}
        onDelete={() => {}}
      />
    );
    const editBtn = screen.getByTestId("event-detail-edit");
    const deleteBtn = screen.getByTestId("event-detail-delete");
    const closeBtn = screen.getByTestId("event-detail-close");
    // The min-height inline style enforces the 44px touch target floor.
    expect(parseInt(editBtn.style.minHeight, 10)).toBeGreaterThanOrEqual(44);
    expect(parseInt(deleteBtn.style.minHeight, 10)).toBeGreaterThanOrEqual(44);
    expect(parseInt(closeBtn.style.minHeight, 10)).toBeGreaterThanOrEqual(44);
  });

  it("calls onEdit with the event when the edit button is tapped", () => {
    const onEdit = vi.fn();
    render(
      <EventDetailSheet
        event={event}
        members={[dad, mom]}
        onClose={() => {}}
        onEdit={onEdit}
      />
    );
    fireEvent.click(screen.getByTestId("event-detail-edit"));
    expect(onEdit).toHaveBeenCalledWith(event);
  });

  it("calls onDelete with the event id when the delete button is tapped", () => {
    const onDelete = vi.fn();
    render(
      <EventDetailSheet
        event={event}
        members={[dad, mom]}
        onClose={() => {}}
        onDelete={onDelete}
      />
    );
    fireEvent.click(screen.getByTestId("event-detail-delete"));
    expect(onDelete).toHaveBeenCalledWith("evt-1");
  });

  it("calls onClose when the close button is tapped", () => {
    const onClose = vi.fn();
    render(<EventDetailSheet event={event} members={[dad, mom]} onClose={onClose} />);
    fireEvent.click(screen.getByTestId("event-detail-close"));
    expect(onClose).toHaveBeenCalled();
  });

  it("hides the edit/delete buttons when canEdit is false (permission-safe)", () => {
    render(
      <EventDetailSheet
        event={event}
        members={[dad, mom]}
        onClose={() => {}}
        onEdit={() => {}}
        onDelete={() => {}}
        canEdit={false}
      />
    );
    expect(screen.queryByTestId("event-detail-edit")).toBeNull();
    expect(screen.queryByTestId("event-detail-delete")).toBeNull();
  });
});

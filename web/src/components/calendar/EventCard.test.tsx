import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { EventCard } from "./EventCard";
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

const event: TBDEvent = {
  id: "evt-test-1",
  title: "Soccer practice",
  start: "16:00",
  end: "17:00",
  members: ["dad"],
  location: "Park",
};

describe("EventCard", () => {
  it("renders the full variant with title and location", () => {
    render(<EventCard event={event} members={[dad]} />);
    expect(screen.getByText("Soccer practice")).toBeTruthy();
    // location appears after the time range, separated by a middle dot.
    expect(screen.getByText(/Park/)).toBeTruthy();
  });

  it("renders the compact variant", () => {
    render(<EventCard event={event} members={[dad]} variant="compact" />);
    expect(screen.getByText("Soccer practice")).toBeTruthy();
  });

  it("invokes onClick with the event when clicked", () => {
    const onClick = vi.fn();
    render(<EventCard event={event} members={[dad]} onClick={onClick} />);
    fireEvent.click(screen.getByText("Soccer practice"));
    expect(onClick).toHaveBeenCalledWith(event);
  });

  it("invokes onClick on Enter key (compact)", () => {
    const onClick = vi.fn();
    render(
      <EventCard event={event} members={[dad]} variant="compact" onClick={onClick} />
    );
    const card = screen.getByTestId(`event-card-${event.id}`);
    fireEvent.keyDown(card, { key: "Enter" });
    expect(onClick).toHaveBeenCalledWith(event);
  });

  it("falls back gracefully when no members are passed (compact)", () => {
    render(<EventCard event={event} variant="compact" />);
    expect(screen.getByText("Soccer practice")).toBeTruthy();
  });
});

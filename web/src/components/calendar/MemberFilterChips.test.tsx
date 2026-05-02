import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemberFilterChips } from "./MemberFilterChips";
import type { Member } from "@/lib/data";

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

const kid: Member = {
  id: "kid",
  name: "Kid",
  full: "Pebbles",
  role: "child",
  color: "#10B981",
  initial: "P",
  stars: 0,
  streak: 0,
};

describe("MemberFilterChips", () => {
  it("renders one chip per member plus the 'All' chip", () => {
    render(
      <MemberFilterChips members={[dad, mom, kid]} selected={null} onChange={() => {}} />
    );
    // "All" + 3 members = 4 chips
    expect(screen.getByTestId("member-filter-all")).toBeTruthy();
    expect(screen.getByTestId("member-filter-dad")).toBeTruthy();
    expect(screen.getByTestId("member-filter-mom")).toBeTruthy();
    expect(screen.getByTestId("member-filter-kid")).toBeTruthy();
  });

  it("marks 'All' as selected when selected is null", () => {
    render(
      <MemberFilterChips members={[dad, mom]} selected={null} onChange={() => {}} />
    );
    expect(screen.getByTestId("member-filter-all").getAttribute("data-selected")).toBe(
      "true"
    );
    expect(screen.getByTestId("member-filter-dad").getAttribute("data-selected")).toBe(
      "false"
    );
  });

  it("marks the chosen member chip as selected", () => {
    render(
      <MemberFilterChips members={[dad, mom]} selected="mom" onChange={() => {}} />
    );
    expect(screen.getByTestId("member-filter-mom").getAttribute("data-selected")).toBe(
      "true"
    );
    expect(screen.getByTestId("member-filter-all").getAttribute("data-selected")).toBe(
      "false"
    );
  });

  it("calls onChange with member id when a chip is tapped", () => {
    const onChange = vi.fn();
    render(
      <MemberFilterChips members={[dad, mom]} selected={null} onChange={onChange} />
    );
    fireEvent.click(screen.getByTestId("member-filter-mom"));
    expect(onChange).toHaveBeenCalledWith("mom");
  });

  it("calls onChange with null when 'All' is tapped", () => {
    const onChange = vi.fn();
    render(
      <MemberFilterChips members={[dad, mom]} selected="dad" onChange={onChange} />
    );
    fireEvent.click(screen.getByTestId("member-filter-all"));
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it("filterEventsByMember returns only events assigned to the chosen member", async () => {
    const { filterEventsByMember } = await import("./MemberFilterChips");
    const events = [
      { id: "e1", title: "Soccer", start: "16:00", end: "17:00", members: ["kid"] },
      { id: "e2", title: "Date night", start: "19:00", end: "21:00", members: ["dad", "mom"] },
      { id: "e3", title: "Dentist", start: "10:00", end: "11:00", members: ["dad"] },
    ];
    const filtered = filterEventsByMember(events, "dad");
    expect(filtered.map((e) => e.id).sort()).toEqual(["e2", "e3"]);
  });

  it("filterEventsByMember returns all events when memberId is null", async () => {
    const { filterEventsByMember } = await import("./MemberFilterChips");
    const events = [
      { id: "e1", title: "Soccer", start: "16:00", end: "17:00", members: ["kid"] },
      { id: "e2", title: "Date night", start: "19:00", end: "21:00", members: ["dad"] },
    ];
    expect(filterEventsByMember(events, null)).toHaveLength(2);
  });

  it("filterEventsByMember prefers assigned_members over legacy members", async () => {
    const { filterEventsByMember } = await import("./MemberFilterChips");
    const events = [
      {
        id: "e1",
        title: "Mixed",
        start: "10:00",
        end: "11:00",
        members: ["kid"], // legacy
        assigned_members: ["dad"], // canonical
      },
    ];
    expect(filterEventsByMember(events, "dad").map((e) => e.id)).toEqual(["e1"]);
    expect(filterEventsByMember(events, "kid")).toHaveLength(0);
  });
});

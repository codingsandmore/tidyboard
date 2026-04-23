import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Avatar, StackedAvatars } from "./avatar";
import { getMember, getMembers } from "@/lib/data";

const dad = getMember("dad");
const mom = getMember("mom");
const jackson = getMember("jackson");
const emma = getMember("emma");

describe("Avatar", () => {
  it("renders the member's initial", () => {
    render(<Avatar member={dad} />);
    expect(screen.getByText("D")).toBeTruthy();
  });

  it("applies the member color as background", () => {
    const { container } = render(<Avatar member={mom} />);
    const div = container.firstChild as HTMLElement;
    // jsdom normalises hex to rgb — just check it's set
    expect(div.style.background).toBeTruthy();
  });

  it("does not show initial when showInitial=false", () => {
    const { queryByText } = render(<Avatar member={dad} showInitial={false} />);
    expect(queryByText("D")).toBeNull();
  });

  it("applies custom size", () => {
    const { container } = render(<Avatar member={jackson} size={80} />);
    const div = container.firstChild as HTMLElement;
    expect(div.style.width).toBe("80px");
    expect(div.style.height).toBe("80px");
  });

  it("applies ring when selected=true", () => {
    const { container } = render(<Avatar member={emma} selected ring />);
    const div = container.firstChild as HTMLElement;
    expect(div.style.boxShadow).not.toBe("none");
  });

  it("has no ring shadow when ring=false", () => {
    const { container } = render(<Avatar member={dad} ring={false} />);
    const div = container.firstChild as HTMLElement;
    expect(div.style.boxShadow).toBe("none");
  });
});

describe("StackedAvatars", () => {
  it("renders all avatars when within max", () => {
    const members = getMembers(["dad", "mom"]);
    const { getAllByText } = render(<StackedAvatars members={members} max={4} />);
    // D and M initials
    expect(getAllByText(/^[DM]$/).length).toBe(2);
  });

  it("shows overflow badge when members exceed max", () => {
    const members = getMembers(["dad", "mom", "jackson", "emma"]);
    const { getByText } = render(<StackedAvatars members={members} max={2} />);
    expect(getByText("+2")).toBeTruthy();
  });

  it("shows no overflow badge when exactly at max", () => {
    const members = getMembers(["dad", "mom"]);
    const { queryByText } = render(<StackedAvatars members={members} max={2} />);
    expect(queryByText(/^\+/)).toBeNull();
  });

  it("shows only max avatars when truncated", () => {
    const members = getMembers(["dad", "mom", "jackson", "emma"]);
    const { queryByText } = render(<StackedAvatars members={members} max={2} />);
    // jackson = J, emma = E should not show initials (they are in the +2)
    expect(queryByText("J")).toBeNull();
    expect(queryByText("E")).toBeNull();
  });
});

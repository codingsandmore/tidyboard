import { describe, it, expect } from "vitest";
import {
  normalizeMemberColor,
  getMemberInitials,
  toWidgetMember,
  DEFAULT_MEMBER_COLOR,
  type WidgetMember,
} from "./family-roster";
import type { Member } from "./data";

describe("normalizeMemberColor", () => {
  it("lowercases and trims a valid hex color", () => {
    expect(normalizeMemberColor("#FFAA00")).toBe("#ffaa00");
    expect(normalizeMemberColor("  #ABCDEF  ")).toBe("#abcdef");
  });

  it("falls back to DEFAULT_MEMBER_COLOR when missing or invalid", () => {
    expect(normalizeMemberColor("")).toBe(DEFAULT_MEMBER_COLOR);
    expect(normalizeMemberColor("not-a-color")).toBe(DEFAULT_MEMBER_COLOR);
    // @ts-expect-error — runtime fallback for missing input
    expect(normalizeMemberColor(undefined)).toBe(DEFAULT_MEMBER_COLOR);
  });

  it("expands 3-digit hex to 6-digit", () => {
    expect(normalizeMemberColor("#abc")).toBe("#aabbcc");
  });
});

describe("getMemberInitials", () => {
  it("returns first letter of single-name", () => {
    expect(getMemberInitials("Alice")).toBe("A");
  });

  it("returns first letter of first + last word for multi-word names", () => {
    expect(getMemberInitials("Alice Smith")).toBe("AS");
    expect(getMemberInitials("mary jane watson")).toBe("MW");
  });

  it("handles empty / whitespace input with a safe fallback", () => {
    expect(getMemberInitials("")).toBe("?");
    expect(getMemberInitials("   ")).toBe("?");
  });
});

describe("toWidgetMember", () => {
  const baseMember: Member = {
    id: "m1",
    name: "Alice",
    full: "Alice Smith",
    role: "adult",
    color: "#FF0000",
    initial: "A",
    stars: 5,
    streak: 2,
    age_group: "adult",
  };

  it("projects an adult member to the widget shape", () => {
    const w: WidgetMember = toWidgetMember(baseMember);
    expect(w).toEqual({
      id: "m1",
      name: "Alice",
      role: "adult",
      color: "#ff0000",
      initials: "AS",
      age_group: "adult",
    });
  });

  it("projects a child member preserving role and age_group", () => {
    const w = toWidgetMember({
      ...baseMember,
      id: "k1",
      name: "Bobby",
      full: "Bobby Smith",
      role: "child",
      age_group: "tween",
    });
    expect(w.role).toBe("child");
    expect(w.age_group).toBe("tween");
    expect(w.initials).toBe("BS");
  });

  it("projects a pet member with normalized color fallback", () => {
    const w = toWidgetMember({
      ...baseMember,
      id: "p1",
      name: "Rex",
      full: "Rex",
      role: "pet",
      color: "",
      age_group: "pet",
    });
    expect(w.role).toBe("pet");
    expect(w.color).toBe(DEFAULT_MEMBER_COLOR);
    expect(w.initials).toBe("R");
  });

  it("does not expose admin-only fields like stars or streak", () => {
    const w = toWidgetMember(baseMember) as Record<string, unknown>;
    expect(w).not.toHaveProperty("stars");
    expect(w).not.toHaveProperty("streak");
    expect(w).not.toHaveProperty("full");
  });
});

import { describe, it, expect } from "vitest";
import { cn } from "./utils";

describe("cn (class merger)", () => {
  it("returns empty string for no args", () => {
    expect(cn()).toBe("");
  });

  it("returns a single class unchanged", () => {
    expect(cn("foo")).toBe("foo");
  });

  it("joins multiple classes", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("ignores falsy values", () => {
    expect(cn("foo", undefined, false, null, "bar")).toBe("foo bar");
  });

  it("merges conflicting Tailwind classes (last wins)", () => {
    // tailwind-merge should keep the last conflicting utility
    const result = cn("p-4", "p-8");
    expect(result).toBe("p-8");
  });

  it("merges text-color conflicts", () => {
    const result = cn("text-red-500", "text-blue-500");
    expect(result).toBe("text-blue-500");
  });

  it("handles conditional classes via object", () => {
    const result = cn({ "font-bold": true, "text-sm": false }, "text-base");
    expect(result).toContain("font-bold");
    expect(result).not.toContain("text-sm");
  });

  it("handles array inputs", () => {
    const result = cn(["foo", "bar"], "baz");
    expect(result).toBe("foo bar baz");
  });
});

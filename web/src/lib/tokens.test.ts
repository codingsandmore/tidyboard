import { describe, it, expect } from "vitest";
import { TB, TYPE } from "./tokens";

describe("TB design tokens", () => {
  it("has primary color", () => {
    expect(TB.primary).toBe("#4F7942");
  });

  it("has surface and bg keys", () => {
    expect(TB.surface).toBeTruthy();
    expect(TB.bg).toBeTruthy();
    expect(TB.bg2).toBeTruthy();
  });

  it("has dark mode equivalents", () => {
    expect(TB.dBg).toBeTruthy();
    expect(TB.dText).toBeTruthy();
    expect(TB.dBorder).toBeTruthy();
  });

  it("memberColors is non-empty array", () => {
    expect(TB.memberColors.length).toBeGreaterThan(0);
    for (const c of TB.memberColors) {
      expect(c).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it("has font strings", () => {
    expect(typeof TB.fontDisplay).toBe("string");
    expect(typeof TB.fontBody).toBe("string");
    expect(typeof TB.fontMono).toBe("string");
  });

  it("has radius tokens", () => {
    expect(typeof TB.r.sm).toBe("number");
    expect(typeof TB.r.md).toBe("number");
    expect(typeof TB.r.lg).toBe("number");
    expect(typeof TB.r.xl).toBe("number");
    expect(typeof TB.r.full).toBe("number");
  });

  it("has shadow strings", () => {
    expect(typeof TB.shadow).toBe("string");
    expect(typeof TB.shadowLg).toBe("string");
  });
});

describe("TYPE typography specs", () => {
  it("is non-empty", () => {
    expect(Object.keys(TYPE).length).toBeGreaterThan(0);
  });

  it("has h1, h2, h3 entries", () => {
    expect(TYPE.h1).toBeDefined();
    expect(TYPE.h2).toBeDefined();
    expect(TYPE.h3).toBeDefined();
  });

  it("has kiosk entry", () => {
    expect(TYPE.kiosk).toBeDefined();
  });

  it("each entry has font, size, weight", () => {
    for (const key of Object.keys(TYPE)) {
      const spec = TYPE[key];
      expect(typeof spec.font).toBe("string");
      expect(typeof spec.size).toBe("number");
      expect(typeof spec.weight).toBe("number");
    }
  });

  it("h1 has larger size than h3", () => {
    expect(TYPE.h1.size).toBeGreaterThan(TYPE.h3.size);
  });
});

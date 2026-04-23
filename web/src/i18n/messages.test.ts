import { describe, it, expect } from "vitest";
import en from "./messages/en.json";
import de from "./messages/de.json";

type NestedRecord = { [key: string]: string | NestedRecord };

/**
 * Recursively collect all dot-separated key paths from a nested object.
 */
function collectKeys(obj: NestedRecord, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "object" && value !== null) {
      return collectKeys(value as NestedRecord, path);
    }
    return [path];
  });
}

describe("i18n message key parity", () => {
  const enKeys = collectKeys(en as NestedRecord).sort();
  const deKeys = collectKeys(de as NestedRecord).sort();

  it("de.json has exactly the same keys as en.json", () => {
    expect(deKeys).toEqual(enKeys);
  });

  it("en.json has no empty string values", () => {
    const empty = enKeys.filter((k) => {
      const parts = k.split(".");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let node: any = en;
      for (const p of parts) node = node[p];
      return node === "";
    });
    expect(empty).toEqual([]);
  });

  it("de.json has no empty string values", () => {
    const empty = deKeys.filter((k) => {
      const parts = k.split(".");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let node: any = de;
      for (const p of parts) node = node[p];
      return node === "";
    });
    expect(empty).toEqual([]);
  });
});

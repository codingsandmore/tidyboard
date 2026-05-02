import { describe, it, expect } from "vitest";
import { GET, buildCompanionManifest } from "./route";

describe("/companion/manifest", () => {
  it("buildCompanionManifest returns a companion-shaped manifest", () => {
    const m = buildCompanionManifest();
    expect(m.name).toBe("Tidyboard Companion");
    expect(m.short_name).toBe("Companion");
    expect(m.start_url).toBe("/companion");
    expect(m.display).toBe("standalone");
  });

  it("declares shortcuts for the three companion sub-pages", () => {
    const m = buildCompanionManifest();
    const urls = m.shortcuts.map((s) => s.url);
    expect(urls).toContain("/companion/events");
    expect(urls).toContain("/companion/chores");
    expect(urls).toContain("/companion/shopping");
  });

  it("each shortcut description carries the companion flag", () => {
    const m = buildCompanionManifest();
    expect(m.shortcuts.length).toBeGreaterThan(0);
    for (const s of m.shortcuts) {
      expect(s.description.toLowerCase()).toContain("companion");
    }
  });

  it("GET responds with the manifest+json content type and parseable body", async () => {
    const res = GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/manifest+json");
    const body = await res.json();
    expect(body.name).toBe("Tidyboard Companion");
    expect(Array.isArray(body.shortcuts)).toBe(true);
  });
});

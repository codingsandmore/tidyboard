import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PantryCues, computePantryCues, type PantryCueRecord } from "./PantryCues";

const fixedNow = new Date("2026-04-30T12:00:00Z");

describe("computePantryCues", () => {
  it("returns nothing when records have no signals", () => {
    expect(computePantryCues([])).toEqual([]);
    expect(computePantryCues([{ id: "a", name: "milk" }])).toEqual([]);
  });

  it("flags low stock at or below threshold", () => {
    const records: PantryCueRecord[] = [
      { id: "a", name: "milk", amount: 0 },
      { id: "b", name: "eggs", amount: 1 },
      { id: "c", name: "butter", amount: 4 },
    ];
    const out = computePantryCues(records, { now: fixedNow, lowStockThreshold: 1 });
    expect(out.map((c) => c.name).sort()).toEqual(["eggs", "milk"]);
    expect(out.every((c) => c.kind === "low")).toBe(true);
  });

  it("flags upcoming expirations within window", () => {
    const records: PantryCueRecord[] = [
      { id: "a", name: "yogurt", expiresOn: "2026-05-02" }, // 2 days
      { id: "b", name: "cheese", expiresOn: "2026-05-15" }, // out of window
    ];
    const out = computePantryCues(records, { now: fixedNow, expiringWithinDays: 5 });
    expect(out).toHaveLength(1);
    expect(out[0].name).toBe("yogurt");
    expect(out[0].kind).toBe("expiring");
    expect(out[0].daysUntilExpiry).toBe(2);
    expect(out[0].message).toMatch(/yogurt/i);
    expect(out[0].message).toMatch(/2 days/);
  });

  it("flags already-expired items as expired with negative days", () => {
    const records: PantryCueRecord[] = [
      { id: "a", name: "milk", expiresOn: "2026-04-27" }, // 3 days ago
    ];
    const out = computePantryCues(records, { now: fixedNow });
    expect(out).toHaveLength(1);
    expect(out[0].kind).toBe("expired");
    expect(out[0].daysUntilExpiry).toBe(-3);
    expect(out[0].message).toMatch(/expired/i);
  });

  it("renders 'expires today' for same-day", () => {
    const out = computePantryCues(
      [{ id: "a", name: "berries", expiresOn: "2026-04-30" }],
      { now: fixedNow }
    );
    expect(out[0].message).toMatch(/today/i);
    expect(out[0].kind).toBe("expiring");
  });

  it("orders cues: expired, then expiring (sooner first), then low", () => {
    const records: PantryCueRecord[] = [
      { id: "a", name: "milk", amount: 0 },
      { id: "b", name: "yogurt", expiresOn: "2026-05-02" }, // 2 days
      { id: "c", name: "berries", expiresOn: "2026-04-29" }, // expired
      { id: "d", name: "salsa", expiresOn: "2026-05-01" }, // 1 day
    ];
    const out = computePantryCues(records, { now: fixedNow });
    expect(out.map((c) => c.kind)).toEqual(["expired", "expiring", "expiring", "low"]);
    expect(out[1].name).toBe("salsa"); // sooner-first
    expect(out[2].name).toBe("yogurt");
  });

  it("emits both low and expiring for the same record when applicable", () => {
    const out = computePantryCues(
      [{ id: "a", name: "milk", amount: 0, expiresOn: "2026-05-02" }],
      { now: fixedNow }
    );
    expect(out.map((c) => c.kind).sort()).toEqual(["expiring", "low"]);
  });

  it("ignores invalid expiry strings", () => {
    expect(
      computePantryCues([{ id: "a", name: "x", expiresOn: "not-a-date" }], { now: fixedNow })
    ).toEqual([]);
  });
});

describe("PantryCues view", () => {
  it("renders nothing when there are no cues", () => {
    const { container } = render(<PantryCues records={[]} now={fixedNow} />);
    expect(container.querySelector("[data-testid='pantry-cues']")).toBeNull();
  });

  it("renders low + expiring cues with their kind testids", () => {
    render(
      <PantryCues
        now={fixedNow}
        records={[
          { id: "a", name: "milk", amount: 0 },
          { id: "b", name: "yogurt", expiresOn: "2026-05-02" },
        ]}
      />
    );
    expect(screen.getByTestId("pantry-cues")).toBeTruthy();
    expect(screen.getByTestId("pantry-cue-low").textContent).toMatch(/milk/i);
    expect(screen.getByTestId("pantry-cue-expiring").textContent).toMatch(/yogurt/i);
  });

  it("uses role=status for accessibility", () => {
    render(<PantryCues now={fixedNow} records={[{ id: "a", name: "milk", amount: 0 }]} />);
    expect(screen.getByRole("status")).toBeTruthy();
  });

  it("renders expired cue with the destructive testid hook", () => {
    render(
      <PantryCues
        now={fixedNow}
        records={[{ id: "a", name: "milk", expiresOn: "2026-04-25" }]}
      />
    );
    expect(screen.getByTestId("pantry-cue-expired")).toBeTruthy();
  });
});

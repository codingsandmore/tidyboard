import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MobileShell, COMPANION_TABS } from "./MobileShell";

describe("MobileShell", () => {
  it("renders the heading and subheading", () => {
    render(
      <MobileShell active="home" heading="Hello" subheading="World">
        <div>body</div>
      </MobileShell>
    );
    expect(screen.getByRole("heading", { name: "Hello" })).toBeTruthy();
    expect(screen.getByText("World")).toBeTruthy();
    expect(screen.getByText("body")).toBeTruthy();
  });

  it("renders all companion tabs", () => {
    render(
      <MobileShell active="home" heading="x">
        <div />
      </MobileShell>
    );
    for (const tab of COMPANION_TABS) {
      expect(
        screen.getByTestId(`companion-tab-${tab.id}`)
      ).toBeTruthy();
      expect(screen.getByText(tab.label)).toBeTruthy();
    }
  });

  it("marks the active tab with aria-current=page", () => {
    render(
      <MobileShell active="events" heading="x">
        <div />
      </MobileShell>
    );
    const eventsTab = screen.getByTestId("companion-tab-events");
    expect(eventsTab.getAttribute("aria-current")).toBe("page");
    const choresTab = screen.getByTestId("companion-tab-chores");
    expect(choresTab.getAttribute("aria-current")).toBeNull();
  });

  it("each tab is an anchor with the right href", () => {
    render(
      <MobileShell active="home" heading="x">
        <div />
      </MobileShell>
    );
    for (const tab of COMPANION_TABS) {
      const a = screen.getByTestId(`companion-tab-${tab.id}`);
      expect(a.tagName.toLowerCase()).toBe("a");
      expect(a.getAttribute("href")).toBe(tab.href);
    }
  });

  it("exports exactly four tabs (home + 3 sections)", () => {
    // Locks the spec for the issue: companion has 3 sub-pages plus a home.
    expect(COMPANION_TABS.length).toBe(4);
    const ids = COMPANION_TABS.map((t) => t.id);
    expect(ids).toContain("home");
    expect(ids).toContain("events");
    expect(ids).toContain("chores");
    expect(ids).toContain("shopping");
  });
});

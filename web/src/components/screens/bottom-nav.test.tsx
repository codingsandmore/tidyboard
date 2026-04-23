import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { BottomNav } from "./bottom-nav";

const TABS = [
  { n: "calendar" as const, l: "Calendar", href: "/calendar" },
  { n: "checkCircle" as const, l: "Routines", href: "/routines" },
  { n: "list" as const, l: "Lists", href: "/shopping" },
];

describe("BottomNav", () => {
  it("renders without crashing", () => {
    render(<BottomNav tabs={TABS} />);
  });

  it("shows all tab labels", () => {
    render(<BottomNav tabs={TABS} />);
    expect(screen.getByText("Calendar")).toBeTruthy();
    expect(screen.getByText("Routines")).toBeTruthy();
    expect(screen.getByText("Lists")).toBeTruthy();
  });

  it("renders hrefs as anchor links", () => {
    const { container } = render(<BottomNav tabs={TABS} />);
    const links = container.querySelectorAll("a");
    expect(links.length).toBe(3);
    expect(links[0].getAttribute("href")).toBe("/calendar");
  });

  it("renders tabs without href as divs", () => {
    const tabsNoHref = [{ n: "calendar" as const, l: "Calendar" }];
    const { container } = render(<BottomNav tabs={tabsNoHref} />);
    expect(container.querySelector("a")).toBeNull();
  });

  it("renders compact variant without crashing", () => {
    render(<BottomNav tabs={TABS} compact />);
    expect(screen.getByText("Calendar")).toBeTruthy();
  });

  it("renders dark mode without crashing", () => {
    render(<BottomNav tabs={TABS} dark />);
    expect(screen.getByText("Calendar")).toBeTruthy();
  });

  it("shows active indicator on active tab", () => {
    const { container } = render(<BottomNav tabs={TABS} active={0} />);
    // The active tab has a colored underline div
    const dots = container.querySelectorAll("div[style*='height: 3px']");
    expect(dots.length).toBeGreaterThan(0);
  });
});

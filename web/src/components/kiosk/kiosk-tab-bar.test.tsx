import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { DEFAULT_KIOSK_TABS, KioskTabBar } from "./kiosk-tab-bar";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    // eslint-disable-next-line @next/next/no-html-link-for-pages
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

describe("KioskTabBar", () => {
  it("renders all four tabs with hrefs", () => {
    render(<KioskTabBar tabs={DEFAULT_KIOSK_TABS} activeId="today" />);
    expect(screen.getByTestId("kiosk-tab-today")).toBeTruthy();
    expect(screen.getByTestId("kiosk-tab-week")).toBeTruthy();
    expect(screen.getByTestId("kiosk-tab-meals")).toBeTruthy();
    expect(screen.getByTestId("kiosk-tab-tasks")).toBeTruthy();
    expect(
      (screen.getByTestId("kiosk-tab-week") as HTMLAnchorElement).getAttribute(
        "href"
      )
    ).toBe("/kiosk/week");
  });

  it("marks the active tab with aria-current", () => {
    render(<KioskTabBar tabs={DEFAULT_KIOSK_TABS} activeId="meals" />);
    expect(
      screen.getByTestId("kiosk-tab-meals").getAttribute("aria-current")
    ).toBe("page");
    expect(
      screen.getByTestId("kiosk-tab-today").getAttribute("aria-current")
    ).toBeNull();
  });
});

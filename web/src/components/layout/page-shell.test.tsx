import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PageShell } from "./page-shell";

describe("PageShell", () => {
  it("renders children in the main slot", () => {
    render(
      <PageShell>
        <div>main-content</div>
      </PageShell>,
    );
    expect(screen.getByText("main-content")).toBeTruthy();
  });

  it("renders header slot when provided", () => {
    render(
      <PageShell header={<div>my-header</div>}>
        <div>main</div>
      </PageShell>,
    );
    expect(screen.getByText("my-header")).toBeTruthy();
  });

  it("renders footer slot when provided", () => {
    render(
      <PageShell footer={<div>my-footer</div>}>
        <div>main</div>
      </PageShell>,
    );
    expect(screen.getByText("my-footer")).toBeTruthy();
  });

  it("does not render header/footer slots when omitted", () => {
    const { container } = render(
      <PageShell>
        <div>main-only</div>
      </PageShell>,
    );
    expect(container.querySelector('[data-page-shell-slot="header"]')).toBeNull();
    expect(container.querySelector('[data-page-shell-slot="footer"]')).toBeNull();
    expect(container.querySelector('[data-page-shell-slot="main"]')).toBeTruthy();
  });

  it("renders all three slots in document order: header, main, footer", () => {
    const { container } = render(
      <PageShell header={<div>H</div>} footer={<div>F</div>}>
        <div>M</div>
      </PageShell>,
    );
    const slots = Array.from(
      container.querySelectorAll("[data-page-shell-slot]"),
    ).map((el) => el.getAttribute("data-page-shell-slot"));
    expect(slots).toEqual(["header", "main", "footer"]);
  });

  it("applies the data-testid to the outer container", () => {
    render(
      <PageShell data-testid="shell-x">
        <div>main</div>
      </PageShell>,
    );
    expect(screen.getByTestId("shell-x")).toBeTruthy();
  });

  it("applies dark tokens when dark=true", () => {
    const { container } = render(
      <PageShell dark>
        <div>m</div>
      </PageShell>,
    );
    const root = container.firstChild as HTMLElement;
    // TB.dBg = "#1C1917"; verify by computed style attribute
    expect(root.style.background.toLowerCase()).toContain("1c1917");
  });
});

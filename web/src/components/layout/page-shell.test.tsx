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
    // TB.dBg = "#1C1917" — jsdom normalizes hex to rgb(28, 25, 23).
    expect(root.style.background).toBe("rgb(28, 25, 23)");
  });

  it("applies light tokens by default (TB.bg)", () => {
    const { container } = render(
      <PageShell>
        <div>m</div>
      </PageShell>,
    );
    const root = container.firstChild as HTMLElement;
    // TB.bg = "#FAFAF9" → rgb(250, 250, 249)
    expect(root.style.background).toBe("rgb(250, 250, 249)");
  });

  it("respects an explicit background override", () => {
    const { container } = render(
      <PageShell background="#abcdef">
        <div>m</div>
      </PageShell>,
    );
    const root = container.firstChild as HTMLElement;
    expect(root.style.background).toBe("rgb(171, 205, 239)");
  });
});

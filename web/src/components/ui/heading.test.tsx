import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { H } from "./heading";

describe("H (heading)", () => {
  it("renders children text", () => {
    render(<H>Hello world</H>);
    expect(screen.getByText("Hello world")).toBeTruthy();
  });

  it("renders as h1 by default", () => {
    const { container } = render(<H as="h1">Title</H>);
    expect(container.querySelector("h1")).toBeTruthy();
  });

  it("renders as h2", () => {
    const { container } = render(<H as="h2">Sub</H>);
    expect(container.querySelector("h2")).toBeTruthy();
  });

  it("renders as h3", () => {
    const { container } = render(<H as="h3">Sub sub</H>);
    expect(container.querySelector("h3")).toBeTruthy();
  });

  it("renders as div for non-heading type names", () => {
    const { container } = render(<H as="kiosk">Big clock</H>);
    expect(container.querySelector("div")).toBeTruthy();
  });

  it("applies custom style", () => {
    const { getByText } = render(<H style={{ color: "red" }}>Styled</H>);
    const el = getByText("Styled") as HTMLElement;
    expect(el.style.color).toBe("red");
  });

  it("applies font size from TYPE spec for h2", () => {
    const { getByText } = render(<H as="h2">Test</H>);
    const el = getByText("Test") as HTMLElement;
    expect(el.style.fontSize).toBeTruthy();
  });
});

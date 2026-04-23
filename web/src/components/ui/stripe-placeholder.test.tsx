import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StripePlaceholder } from "./stripe-placeholder";

describe("StripePlaceholder", () => {
  it("renders a div", () => {
    const { container } = render(<StripePlaceholder />);
    expect(container.querySelector("div")).toBeTruthy();
  });

  it("shows label when provided", () => {
    render(<StripePlaceholder label="photo placeholder" />);
    expect(screen.getByText("photo placeholder")).toBeTruthy();
  });

  it("shows no text when label is empty", () => {
    const { container } = render(<StripePlaceholder label="" />);
    const div = container.firstChild as HTMLElement;
    expect(div.textContent).toBe("");
  });

  it("applies default height of 160", () => {
    const { container } = render(<StripePlaceholder />);
    const div = container.firstChild as HTMLElement;
    expect(div.style.height).toBe("160px");
  });

  it("applies custom height", () => {
    const { container } = render(<StripePlaceholder h={80} />);
    const div = container.firstChild as HTMLElement;
    expect(div.style.height).toBe("80px");
  });

  it("applies custom width", () => {
    const { container } = render(<StripePlaceholder w={200} />);
    const div = container.firstChild as HTMLElement;
    expect(div.style.width).toBe("200px");
  });

  it("applies string width (100%)", () => {
    const { container } = render(<StripePlaceholder w="100%" />);
    const div = container.firstChild as HTMLElement;
    expect(div.style.width).toBe("100%");
  });

  it("has stripe background", () => {
    const { container } = render(<StripePlaceholder />);
    const div = container.firstChild as HTMLElement;
    expect(div.style.background).toContain("linear-gradient");
  });

  it("applies custom style", () => {
    const { container } = render(<StripePlaceholder style={{ borderRadius: 0 }} />);
    const div = container.firstChild as HTMLElement;
    expect(div.style.borderRadius).toBe("0px");
  });
});

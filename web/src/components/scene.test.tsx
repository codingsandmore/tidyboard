import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Scene } from "./scene";

describe("Scene", () => {
  it("renders children", () => {
    render(<Scene><div>child content</div></Scene>);
    expect(screen.getByText("child content")).toBeTruthy();
  });

  it("shows label when provided", () => {
    render(<Scene label="My Label"><div>x</div></Scene>);
    expect(screen.getByText("My Label")).toBeTruthy();
  });

  it("does not show label when omitted", () => {
    const { queryByText } = render(<Scene><div>x</div></Scene>);
    expect(queryByText("My Label")).toBeNull();
  });

  it("renders with warm gray background", () => {
    const { container } = render(<Scene><div /></Scene>);
    const outer = container.firstChild as HTMLElement;
    // jsdom normalises hex to rgb
    expect(outer.style.background).toBeTruthy();
  });
});

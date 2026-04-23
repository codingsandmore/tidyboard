import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PhoneFrame, TabletFrame, LaptopFrame } from "./device-frames";

describe("PhoneFrame", () => {
  it("renders children", () => {
    render(<PhoneFrame><div>phone content</div></PhoneFrame>);
    expect(screen.getByText("phone content")).toBeTruthy();
  });

  it("shows status bar by default", () => {
    render(<PhoneFrame><div /></PhoneFrame>);
    expect(screen.getByText("9:41")).toBeTruthy();
    expect(screen.getByText("100%")).toBeTruthy();
  });

  it("hides status bar when showStatus=false", () => {
    const { queryByText } = render(<PhoneFrame showStatus={false}><div /></PhoneFrame>);
    expect(queryByText("9:41")).toBeNull();
  });

  it("applies custom width", () => {
    const { container } = render(<PhoneFrame w={320}><div /></PhoneFrame>);
    const outer = container.firstChild as HTMLElement;
    expect(outer.style.width).toBe("336px"); // 320 + 16
  });
});

describe("TabletFrame", () => {
  it("renders children", () => {
    render(<TabletFrame><div>tablet content</div></TabletFrame>);
    expect(screen.getByText("tablet content")).toBeTruthy();
  });

  it("applies default width", () => {
    const { container } = render(<TabletFrame><div /></TabletFrame>);
    const outer = container.firstChild as HTMLElement;
    expect(outer.style.width).toBe("792px"); // 768 + 24
  });
});

describe("LaptopFrame", () => {
  it("renders children", () => {
    render(<LaptopFrame><div>laptop content</div></LaptopFrame>);
    expect(screen.getByText("laptop content")).toBeTruthy();
  });

  it("shows browser chrome area", () => {
    render(<LaptopFrame><div /></LaptopFrame>);
    expect(screen.getByText(/tidyboard · family dashboard/)).toBeTruthy();
  });
});

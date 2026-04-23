import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { FamilyShapes } from "./family-shapes";

describe("FamilyShapes", () => {
  it("renders an svg", () => {
    const { container } = render(<FamilyShapes />);
    expect(container.querySelector("svg")).toBeTruthy();
  });

  it("applies default size", () => {
    const { container } = render(<FamilyShapes />);
    const svg = container.querySelector("svg")!;
    expect(svg.getAttribute("width")).toBe("240");
  });

  it("applies custom size", () => {
    const { container } = render(<FamilyShapes size={320} />);
    const svg = container.querySelector("svg")!;
    expect(svg.getAttribute("width")).toBe("320");
    // height should be size * 0.75 = 240
    expect(svg.getAttribute("height")).toBe("240");
  });

  it("has circles representing family members", () => {
    const { container } = render(<FamilyShapes />);
    const circles = container.querySelectorAll("circle");
    expect(circles.length).toBeGreaterThan(0);
  });

  it("applies custom style", () => {
    const { container } = render(<FamilyShapes style={{ opacity: 0.5 }} />);
    const svg = container.querySelector("svg")!;
    expect(svg.style.opacity).toBe("0.5");
  });
});

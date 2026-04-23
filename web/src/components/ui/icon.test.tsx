import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { Icon, type IconName } from "./icon";

const ALL_ICONS: IconName[] = [
  "calendar", "check", "checkCircle", "plus", "minus", "x",
  "chevronL", "chevronR", "chevronDown", "menu", "user", "users",
  "home", "list", "chef", "star", "flame", "flag", "clock", "bell",
  "mapPin", "search", "settings", "google", "apple", "eye", "camera",
  "link", "trophy", "sun", "moon", "sparkles", "filter", "drag",
  "cloud", "heart", "arrowR", "arrowL", "share", "trash", "pencil",
  "route", "lock", "grid", "columns", "rows", "play", "pause",
];

describe("Icon", () => {
  it("renders an svg element", () => {
    const { container } = render(<Icon name="check" />);
    expect(container.querySelector("svg")).toBeTruthy();
  });

  it("applies size prop to width and height", () => {
    const { container } = render(<Icon name="check" size={32} />);
    const svg = container.querySelector("svg")!;
    expect(svg.getAttribute("width")).toBe("32");
    expect(svg.getAttribute("height")).toBe("32");
  });

  it("applies color to stroke attribute", () => {
    const { container } = render(<Icon name="star" color="#ff0000" />);
    const svg = container.querySelector("svg")!;
    expect(svg.getAttribute("stroke")).toBe("#ff0000");
  });

  it("applies custom stroke width", () => {
    const { container } = render(<Icon name="check" stroke={2.5} />);
    const svg = container.querySelector("svg")!;
    expect(svg.getAttribute("stroke-width")).toBe("2.5");
  });

  it("has correct viewBox", () => {
    const { container } = render(<Icon name="calendar" />);
    const svg = container.querySelector("svg")!;
    expect(svg.getAttribute("viewBox")).toBe("0 0 24 24");
  });

  ALL_ICONS.forEach((name) => {
    it(`renders icon: ${name}`, () => {
      const { container } = render(<Icon name={name} />);
      expect(container.querySelector("svg")).toBeTruthy();
    });
  });
});

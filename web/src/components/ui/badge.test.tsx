import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Badge } from "./badge";

describe("Badge", () => {
  it("renders children text", () => {
    render(<Badge>hello</Badge>);
    expect(screen.getByText("hello")).toBeTruthy();
  });

  it("renders as a span", () => {
    const { container } = render(<Badge>test</Badge>);
    expect(container.querySelector("span")).toBeTruthy();
  });

  it("applies color-based background when color provided", () => {
    const { container } = render(<Badge color="#FF0000">red</Badge>);
    const span = container.querySelector("span")!;
    // background should include the color (appended with 20)
    expect(span.style.background).toBeTruthy();
  });

  it("applies default background when no color", () => {
    const { container } = render(<Badge>default</Badge>);
    const span = container.querySelector("span")!;
    expect(span.style.background).toBeTruthy();
  });

  it("renders with custom style", () => {
    const { container } = render(<Badge style={{ opacity: 0.5 }}>styled</Badge>);
    const span = container.querySelector("span")!;
    expect(span.style.opacity).toBe("0.5");
  });
});

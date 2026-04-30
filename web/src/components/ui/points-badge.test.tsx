import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { PointsBadge } from "./points-badge";

describe("PointsBadge", () => {
  it("renders the value with a + sign for positive values", () => {
    render(<PointsBadge value={5} color="#10b981" />);
    expect(screen.getByText("+5")).toBeInTheDocument();
  });
  it("renders negative values with a minus sign", () => {
    render(<PointsBadge value={-10} color="#10b981" />);
    expect(screen.getByText("-10")).toBeInTheDocument();
  });
  it("uses the passed color in inline style", () => {
    const { container } = render(<PointsBadge value={1} color="#ec4899" />);
    expect(container.firstChild).toHaveStyle({ backgroundColor: "#ec4899" });
  });
});

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MoneyDisplay } from "./money-display";

describe("MoneyDisplay", () => {
  it("formats cents as USD", () => {
    render(<MoneyDisplay cents={4230} />);
    expect(screen.getByText("$42.30")).toBeInTheDocument();
  });
  it("handles zero", () => {
    render(<MoneyDisplay cents={0} />);
    expect(screen.getByText("$0.00")).toBeInTheDocument();
  });
  it("handles negative (cash-out display) with minus sign prefix", () => {
    render(<MoneyDisplay cents={-500} />);
    expect(screen.getByText("−$5.00")).toBeInTheDocument();
  });
  it("applies member color to text when provided", () => {
    const { container } = render(<MoneyDisplay cents={100} color="#22C55E" />);
    expect(container.querySelector("span")).toHaveStyle({ color: "rgb(34, 197, 94)" });
  });
});

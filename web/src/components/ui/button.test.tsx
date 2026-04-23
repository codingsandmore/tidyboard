import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Btn } from "./button";

describe("Btn", () => {
  it("renders children text", () => {
    render(<Btn>Click me</Btn>);
    expect(screen.getByText("Click me")).toBeTruthy();
  });

  it("calls onClick when clicked", () => {
    const onClick = vi.fn();
    render(<Btn onClick={onClick}>Go</Btn>);
    fireEvent.click(screen.getByText("Go"));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("does not call onClick when disabled", () => {
    const onClick = vi.fn();
    render(<Btn onClick={onClick} disabled>Go</Btn>);
    fireEvent.click(screen.getByText("Go"));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("renders as a button element", () => {
    render(<Btn>Save</Btn>);
    expect(screen.getByRole("button")).toBeTruthy();
  });

  it("applies disabled attribute when disabled", () => {
    render(<Btn disabled>Save</Btn>);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("renders with icon when icon prop provided", () => {
    const { container } = render(<Btn icon="check">OK</Btn>);
    expect(container.querySelector("svg")).toBeTruthy();
  });

  it("renders with iconRight", () => {
    const { container } = render(<Btn iconRight="arrowR">Next</Btn>);
    expect(container.querySelector("svg")).toBeTruthy();
  });

  const kinds = ["primary", "secondary", "ghost", "destructive", "accent"] as const;
  kinds.forEach((kind) => {
    it(`renders kind="${kind}" without error`, () => {
      const { getByRole } = render(<Btn kind={kind}>Label</Btn>);
      expect(getByRole("button")).toBeTruthy();
    });
  });

  const sizes = ["sm", "md", "lg", "xl"] as const;
  sizes.forEach((size) => {
    it(`renders size="${size}" without error`, () => {
      const { getByRole } = render(<Btn size={size}>Label</Btn>);
      expect(getByRole("button")).toBeTruthy();
    });
  });

  it("applies full width when full=true", () => {
    const { getByRole } = render(<Btn full>Full</Btn>);
    const btn = getByRole("button") as HTMLButtonElement;
    expect(btn.style.width).toBe("100%");
  });
});

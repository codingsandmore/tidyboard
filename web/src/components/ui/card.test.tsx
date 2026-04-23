import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Card } from "./card";

describe("Card", () => {
  it("renders children", () => {
    render(<Card>Hello card</Card>);
    expect(screen.getByText("Hello card")).toBeTruthy();
  });

  it("calls onClick when clickable", () => {
    const onClick = vi.fn();
    render(<Card onClick={onClick}>Click</Card>);
    fireEvent.click(screen.getByText("Click"));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("uses pointer cursor when onClick provided", () => {
    const { container } = render(<Card onClick={() => {}}>Clickable</Card>);
    const div = container.firstChild as HTMLElement;
    expect(div.style.cursor).toBe("pointer");
  });

  it("uses default cursor when not clickable", () => {
    const { container } = render(<Card>Static</Card>);
    const div = container.firstChild as HTMLElement;
    expect(div.style.cursor).toBe("default");
  });

  it("applies dark background when dark=true", () => {
    const { container } = render(<Card dark>Dark</Card>);
    const div = container.firstChild as HTMLElement;
    // dark mode uses dElevated color
    expect(div.style.background).toBeTruthy();
  });

  it("applies elevated box-shadow when elevated=true", () => {
    const { container } = render(<Card elevated>Elevated</Card>);
    const div = container.firstChild as HTMLElement;
    expect(div.style.boxShadow).not.toBe("none");
  });

  it("applies custom pad", () => {
    const { container } = render(<Card pad={32}>Padded</Card>);
    const div = container.firstChild as HTMLElement;
    expect(div.style.padding).toBe("32px");
  });
});

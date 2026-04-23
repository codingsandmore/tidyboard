import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Input } from "./input";

describe("Input", () => {
  it("renders an input element", () => {
    render(<Input />);
    expect(screen.getByRole("textbox")).toBeTruthy();
  });

  it("shows placeholder text", () => {
    render(<Input placeholder="Type here…" />);
    expect(screen.getByPlaceholderText("Type here…")).toBeTruthy();
  });

  it("displays value", () => {
    render(<Input value="hello" onChange={() => {}} />);
    expect((screen.getByRole("textbox") as HTMLInputElement).value).toBe("hello");
  });

  it("calls onChange with new value", () => {
    const onChange = vi.fn();
    render(<Input value="" onChange={onChange} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "abc" } });
    expect(onChange).toHaveBeenCalledWith("abc");
  });

  it("renders icon when icon prop provided", () => {
    const { container } = render(<Input icon="search" />);
    expect(container.querySelector("svg")).toBeTruthy();
  });

  it("applies error border when error=true", () => {
    const { container } = render(<Input error />);
    const input = container.querySelector("input")!;
    expect(input.style.borderColor).toBeTruthy();
  });

  it("renders with full width by default", () => {
    const { container } = render(<Input />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.style.width).toBe("100%");
  });

  it("renders with auto width when full=false", () => {
    const { container } = render(<Input full={false} />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.style.width).toBe("auto");
  });
});

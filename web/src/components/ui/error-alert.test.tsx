import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ErrorAlert } from "./error-alert";
import type { ApiError } from "@/lib/api/types";

describe("ErrorAlert", () => {
  it("renders status, code, message, requestId from ApiError", () => {
    const error: ApiError = {
      code: "not_found",
      message: "Recipe not found",
      status: 404,
      requestId: "req-abc-123",
      url: "/v1/recipes/999",
      method: "GET",
    };
    render(<ErrorAlert error={error} />);
    expect(screen.getByText("Recipe not found")).toBeInTheDocument();
    expect(screen.getByText(/not_found/)).toBeInTheDocument();
    expect(screen.getByText(/404/)).toBeInTheDocument();
    expect(screen.getByText(/req-abc-123/)).toBeInTheDocument();
  });

  it("renders gracefully for raw Error input", () => {
    const error = new Error("boom");
    render(<ErrorAlert error={error} />);
    expect(screen.getByText(/boom/)).toBeInTheDocument();
  });

  it("renders gracefully for raw string input", () => {
    render(<ErrorAlert error="something broke" />);
    expect(screen.getByText(/something broke/)).toBeInTheDocument();
  });

  it("renders gracefully for null/undefined input", () => {
    const { container } = render(<ErrorAlert error={null} />);
    // Should still render some kind of fallback container, not throw.
    expect(container.firstChild).not.toBeNull();
  });

  it("renders <details> for stack when present", () => {
    const error: ApiError = {
      code: "internal",
      message: "boom",
      status: 500,
      url: "/v1/x",
      method: "POST",
      stack: "Error: boom\n    at foo (bar.ts:1:1)",
    };
    const { container } = render(<ErrorAlert error={error} />);
    const details = container.querySelector("details");
    expect(details).not.toBeNull();
    expect(details?.textContent ?? "").toMatch(/at foo/);
  });

  it("does NOT render <details> when no stack", () => {
    const error: ApiError = {
      code: "x",
      message: "y",
      status: 400,
      url: "/v1/x",
      method: "POST",
    };
    const { container } = render(<ErrorAlert error={error} />);
    expect(container.querySelector("details")).toBeNull();
  });

  it("copies JSON to clipboard on Copy click", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    const error: ApiError = {
      code: "not_found",
      message: "Recipe not found",
      status: 404,
      requestId: "req-abc-123",
      url: "/v1/recipes/999",
      method: "GET",
    };
    render(<ErrorAlert error={error} />);
    const copyBtn = screen.getByTestId("error-alert-copy");
    fireEvent.click(copyBtn);

    expect(writeText).toHaveBeenCalledTimes(1);
    const arg = writeText.mock.calls[0][0] as string;
    const parsed = JSON.parse(arg);
    expect(parsed).toMatchObject({
      code: "not_found",
      message: "Recipe not found",
      status: 404,
      requestId: "req-abc-123",
      url: "/v1/recipes/999",
      method: "GET",
    });
  });

  it("copies serialized fallback for non-ApiError input", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    render(<ErrorAlert error="raw string failure" />);
    const copyBtn = screen.getByTestId("error-alert-copy");
    fireEvent.click(copyBtn);

    expect(writeText).toHaveBeenCalledTimes(1);
    const arg = writeText.mock.calls[0][0] as string;
    expect(arg).toContain("raw string failure");
  });

  it("renders url and method when ApiError carries them", () => {
    const error: ApiError = {
      code: "x",
      message: "y",
      status: 400,
      url: "/v1/widgets",
      method: "PUT",
    };
    render(<ErrorAlert error={error} />);
    expect(screen.getByText(/PUT/)).toBeInTheDocument();
    expect(screen.getByText(/\/v1\/widgets/)).toBeInTheDocument();
  });
});

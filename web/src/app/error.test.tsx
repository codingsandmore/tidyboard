import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Error from "./error";
import type { ApiError } from "@/lib/api/types";

describe("app/error.tsx", () => {
  it("renders <ErrorAlert/> with the provided error", () => {
    const error: ApiError = Object.assign(new globalThis.Error("Recipe not found"), {
      code: "not_found",
      message: "Recipe not found",
      status: 404,
      requestId: "req-error-page-1",
      url: "/v1/recipes/999",
      method: "GET",
    }) as unknown as ApiError;

    render(<Error error={error as unknown as globalThis.Error & { digest?: string }} reset={vi.fn()} />);

    // Delegated to <ErrorAlert/>
    expect(screen.getByTestId("error-alert")).toBeInTheDocument();
    expect(screen.getByTestId("error-alert-message").textContent).toMatch(
      /Recipe not found/,
    );
    expect(screen.getByTestId("error-alert-status").textContent).toMatch(/404/);
    expect(screen.getByTestId("error-alert-code").textContent).toMatch(
      /not_found/,
    );
    expect(screen.getByTestId("error-alert-request-id").textContent).toMatch(
      /req-error-page-1/,
    );
  });

  it("renders gracefully for a plain Error", () => {
    const error = new globalThis.Error("boom") as globalThis.Error & {
      digest?: string;
    };
    render(<Error error={error} reset={vi.fn()} />);
    expect(screen.getByTestId("error-alert")).toBeInTheDocument();
    expect(screen.getByTestId("error-alert-message").textContent).toMatch(
      /boom/,
    );
  });

  it('"Try again" button calls reset()', () => {
    const reset = vi.fn();
    const error = new globalThis.Error("boom") as globalThis.Error & {
      digest?: string;
    };
    render(<Error error={error} reset={reset} />);

    const tryAgain = screen.getByRole("button", { name: /try again/i });
    fireEvent.click(tryAgain);
    expect(reset).toHaveBeenCalledTimes(1);
  });
});

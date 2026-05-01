import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import GlobalError from "./global-error";
import type { ApiError } from "@/lib/api/types";

describe("app/global-error.tsx", () => {
  it("renders <html> and <body> wrappers per Next.js convention", () => {
    const error = new globalThis.Error("boom") as globalThis.Error & {
      digest?: string;
    };
    const { container } = render(
      <GlobalError error={error} reset={vi.fn()} />,
    );

    // global-error.tsx must include its own <html><body> per Next.js docs.
    const html = container.querySelector("html");
    expect(html).not.toBeNull();
    const body = html?.querySelector("body");
    expect(body).not.toBeNull();
  });

  it("renders <ErrorAlert/> with the provided error", () => {
    const error: ApiError = Object.assign(new globalThis.Error("Recipe not found"), {
      code: "not_found",
      message: "Recipe not found",
      status: 404,
      requestId: "req-global-error-1",
      url: "/v1/recipes/999",
      method: "GET",
    }) as unknown as ApiError;

    const { container } = render(
      <GlobalError
        error={error as unknown as globalThis.Error & { digest?: string }}
        reset={vi.fn()}
      />,
    );

    const alert = container.querySelector('[data-testid="error-alert"]');
    expect(alert).not.toBeNull();
    expect(
      container.querySelector('[data-testid="error-alert-message"]')
        ?.textContent ?? "",
    ).toMatch(/Recipe not found/);
    expect(
      container.querySelector('[data-testid="error-alert-status"]')
        ?.textContent ?? "",
    ).toMatch(/404/);
    expect(
      container.querySelector('[data-testid="error-alert-code"]')
        ?.textContent ?? "",
    ).toMatch(/not_found/);
    expect(
      container.querySelector('[data-testid="error-alert-request-id"]')
        ?.textContent ?? "",
    ).toMatch(/req-global-error-1/);
  });

  it('"Try again" button calls reset()', () => {
    const reset = vi.fn();
    const error = new globalThis.Error("boom") as globalThis.Error & {
      digest?: string;
    };
    const { container } = render(
      <GlobalError error={error} reset={reset} />,
    );

    const tryAgain = container.querySelector(
      '[data-testid="global-error-try-again"]',
    ) as HTMLButtonElement | null;
    expect(tryAgain).not.toBeNull();
    fireEvent.click(tryAgain!);
    expect(reset).toHaveBeenCalledTimes(1);
  });
});

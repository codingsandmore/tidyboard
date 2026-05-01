import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { ErrorAlert } from "./error-alert";
import type { ApiError } from "@/lib/api/types";

function withQueryClient(ui: ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{ui}</QueryClientProvider>;
}

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
    const msg = screen.getByTestId("error-alert-message");
    expect(msg.textContent ?? "").toMatch(/boom/);
  });

  it("renders gracefully for raw string input", () => {
    render(<ErrorAlert error="something broke" />);
    const msg = screen.getByTestId("error-alert-message");
    expect(msg.textContent ?? "").toMatch(/something broke/);
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
    await act(async () => {
      fireEvent.click(copyBtn);
    });

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
    await act(async () => {
      fireEvent.click(copyBtn);
    });

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

// ─── Report-to-GitHub button (#140) ────────────────────────────────────────
//
// These tests mock at the network boundary (global fetch) per the project's
// component-test convention. The button should:
//
//   - POST the error JSON + url + user agent + active member name to
//     /v1/bug-reports
//   - on success, surface "Reported as #N" with a link to the issue
//   - on failure, open https://github.com/.../issues/new prefilled in a new tab
//   - rate-limit to ≤ 1 click per 60s per browser session

describe("ErrorAlert · Report to GitHub button", () => {
  const ORIGINAL_FETCH = globalThis.fetch;
  const ORIGINAL_OPEN = globalThis.open;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    globalThis.fetch = ORIGINAL_FETCH;
    globalThis.open = ORIGINAL_OPEN;
  });

  const sampleError: ApiError = {
    code: "internal",
    message: "boom",
    status: 500,
    url: "/v1/recipes/999",
    method: "GET",
    requestId: "req-xyz",
  };

  it("renders a Report to GitHub button next to Copy details", () => {
    render(withQueryClient(<ErrorAlert error={sampleError} />));
    const btn = screen.getByTestId("error-alert-report-github");
    expect(btn).toBeInTheDocument();
    expect(btn.textContent ?? "").toMatch(/Report to GitHub/i);
  });

  it("POSTs to /v1/bug-reports with error JSON, current url, user agent, and active member name", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => null },
      json: () => Promise.resolve({ issue_number: 42, issue_url: "https://github.com/codingsandmore/tidyboard/issues/42" }),
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    render(withQueryClient(<ErrorAlert error={sampleError} />));
    const btn = screen.getByTestId("error-alert-report-github");
    await act(async () => {
      fireEvent.click(btn);
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [calledUrl, init] = fetchMock.mock.calls[0];
    expect(String(calledUrl)).toMatch(/\/v1\/bug-reports$/);
    expect((init as RequestInit).method).toBe("POST");

    const body = JSON.parse((init as RequestInit).body as string);
    expect(body).toMatchObject({
      error: expect.objectContaining({
        code: "internal",
        message: "boom",
        status: 500,
      }),
      url: expect.any(String),
      user_agent: expect.any(String),
    });
    // active member name is included (may be empty string when no active member)
    expect(body).toHaveProperty("member_name");
  });

  it("shows 'Reported as #N' with the issue link on success", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => null },
      json: () => Promise.resolve({ issue_number: 77, issue_url: "https://github.com/codingsandmore/tidyboard/issues/77" }),
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    render(withQueryClient(<ErrorAlert error={sampleError} />));
    const btn = screen.getByTestId("error-alert-report-github");
    await act(async () => {
      fireEvent.click(btn);
    });

    await waitFor(() => {
      const toast = screen.getByTestId("error-alert-report-toast");
      expect(toast.textContent ?? "").toMatch(/#77/);
    });
    const link = screen.getByTestId("error-alert-report-toast-link") as HTMLAnchorElement;
    expect(link.href).toBe("https://github.com/codingsandmore/tidyboard/issues/77");
  });

  it("opens the GitHub new-issue page in a new tab on failure", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      headers: { get: () => null },
      json: () => Promise.resolve({ code: "upstream_unavailable", message: "github offline", status: 503 }),
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const openMock = vi.fn();
    globalThis.open = openMock as unknown as typeof window.open;

    render(withQueryClient(<ErrorAlert error={sampleError} />));
    const btn = screen.getByTestId("error-alert-report-github");
    await act(async () => {
      fireEvent.click(btn);
    });

    await waitFor(() => {
      expect(openMock).toHaveBeenCalledTimes(1);
    });
    const [openUrl, target] = openMock.mock.calls[0];
    expect(String(openUrl)).toMatch(/^https:\/\/github\.com\/codingsandmore\/tidyboard\/issues\/new\?/);
    expect(String(openUrl)).toMatch(/title=/);
    expect(String(openUrl)).toMatch(/body=/);
    expect(target).toBe("_blank");
  });

  it("disables the button for 60s after a click (rate limit)", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => null },
      json: () => Promise.resolve({ issue_number: 1, issue_url: "https://github.com/codingsandmore/tidyboard/issues/1" }),
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    render(withQueryClient(<ErrorAlert error={sampleError} />));
    const btn = screen.getByTestId("error-alert-report-github") as HTMLButtonElement;

    await act(async () => {
      fireEvent.click(btn);
    });
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    // Second click within the cooldown window should NOT issue another fetch.
    await act(async () => {
      fireEvent.click(btn);
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(btn.disabled).toBe(true);

    // After 60s, the button re-enables.
    await act(async () => {
      vi.advanceTimersByTime(60_000);
    });
    expect(btn.disabled).toBe(false);
  });
});

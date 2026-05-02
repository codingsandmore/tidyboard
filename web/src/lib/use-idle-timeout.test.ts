import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useIdleTimeout } from "./use-idle-timeout";

describe("useIdleTimeout", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts non-idle, becomes idle after timeout elapses", () => {
    const { result } = renderHook(() => useIdleTimeout(1000));
    expect(result.current).toBe(false);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current).toBe(true);
  });

  it("resets the timer on user activity", () => {
    const { result } = renderHook(() => useIdleTimeout(1000));

    // Almost time out
    act(() => {
      vi.advanceTimersByTime(900);
    });
    expect(result.current).toBe(false);

    // User activity → reset
    act(() => {
      window.dispatchEvent(new Event("keydown"));
    });
    // Advance to the original timeout — should still be non-idle
    act(() => {
      vi.advanceTimersByTime(900);
    });
    expect(result.current).toBe(false);

    // Now finish the new timeout
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current).toBe(true);
  });

  it("clears idle when activity occurs after going idle", () => {
    const { result } = renderHook(() => useIdleTimeout(500));

    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(result.current).toBe(true);

    act(() => {
      window.dispatchEvent(new Event("mousemove"));
    });
    expect(result.current).toBe(false);
  });

  it("cleans up listeners and timer on unmount", () => {
    const { unmount, result } = renderHook(() => useIdleTimeout(1000));
    unmount();

    // Even after the original timeout, no error should occur and result stays false
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current).toBe(false);
  });
});

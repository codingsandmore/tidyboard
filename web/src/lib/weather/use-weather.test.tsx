import { describe, expect, it } from "vitest";
import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useWeather } from "./use-weather";

function wrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

describe("useWeather", () => {
  it("does not query demo coordinates when no household coordinates are provided", () => {
    const weather = renderHook(() => useWeather(), { wrapper: wrapper() });

    expect(weather.result.current.fetchStatus).toBe("idle");
    expect(weather.result.current.data).toBeUndefined();
  });
});

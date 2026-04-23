/**
 * Shared test utilities for Tidyboard.
 *
 * Import from here rather than from setup.tsx to avoid loading provider
 * modules into every test environment at setup time.
 */

import React from "react";
import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WSProvider } from "@/lib/ws/ws-provider";

/**
 * Creates a fresh QueryClient suitable for isolated tests (no retries).
 */
export function makeTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

/**
 * Renders children inside a QueryClientProvider + WSProvider tree.
 * Use this in any test that needs the WS context (status, lastEvent, reconnect).
 *
 * Callers are responsible for mocking WebSocket, @/lib/auth/auth-store, and
 * @/lib/api/fallback as needed before calling this helper.
 *
 * @example
 *   import { renderWithWS } from "@/test/utils";
 *   const { queryClient } = renderWithWS(<MyComponent />);
 */
export function renderWithWS(
  children: React.ReactNode,
  queryClient?: QueryClient
) {
  const qc = queryClient ?? makeTestQueryClient();
  const utils = render(
    <QueryClientProvider client={qc}>
      <WSProvider>{children}</WSProvider>
    </QueryClientProvider>
  );
  return { ...utils, queryClient: qc };
}

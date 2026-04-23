"use client";

/**
 * ApiProvider — wraps the app in React Query's QueryClientProvider.
 *
 * Place this inside <ThemeProvider> in layout.tsx so theme context is
 * available to any component that needs both theme and API data.
 *
 * Defaults:
 *   staleTime        30 s  — fresh data for 30 s before a background refetch
 *   gcTime           5 min — keep unused query results in cache for 5 minutes
 *   refetchOnWindowFocus false — don't refetch every time the tab regains focus
 *   retry            1     — retry failed requests once before surfacing error
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState, type ReactNode } from "react";

function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30 * 1000,
        gcTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  });
}

export function ApiProvider({ children }: { children: ReactNode }) {
  // Create the client inside state so it's stable across re-renders and
  // each server-render gets its own client (no cross-request data leakage).
  const [queryClient] = useState(makeQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === "development" && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}

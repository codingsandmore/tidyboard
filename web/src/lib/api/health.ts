"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export interface HealthResponse {
  status: "ok";
  timestamp: string;
  version?: string;
}

export interface ReadyResponse {
  status: "ok" | "degraded";
  checks: Record<string, string>;
  failures?: string[];
}

export type SystemStatus = "healthy" | "degraded" | "down" | "unknown";

async function fetchHealth(): Promise<HealthResponse> {
  const res = await fetch(`${BASE_URL}/health`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`health ${res.status}`);
  }
  return (await res.json()) as HealthResponse;
}

async function fetchReady(): Promise<ReadyResponse> {
  const res = await fetch(`${BASE_URL}/ready`, { cache: "no-store" });
  // /ready returns 200 (ok) or 503 (degraded) — both have a JSON body.
  // Anything else is treated as transport failure and bubbles up.
  if (res.status !== 200 && res.status !== 503) {
    throw new Error(`ready ${res.status}`);
  }
  return (await res.json()) as ReadyResponse;
}

export function useHealth(): UseQueryResult<HealthResponse> {
  return useQuery({
    queryKey: ["system", "health"],
    queryFn: fetchHealth,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    staleTime: 10_000,
  });
}

export function useReady(): UseQueryResult<ReadyResponse> {
  return useQuery({
    queryKey: ["system", "ready"],
    queryFn: fetchReady,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    staleTime: 30_000,
  });
}

export interface SystemHealth {
  status: SystemStatus;
  version?: string;
  failures: string[];
  checks: Record<string, string>;
  lastCheckedAt?: string;
  refetch: () => void;
  isFetching: boolean;
}

export function useSystemHealth(): SystemHealth {
  const health = useHealth();
  const ready = useReady();

  const failures = ready.data?.failures ?? [];
  const checks = ready.data?.checks ?? {};

  let status: SystemStatus = "unknown";
  if (health.isError) {
    status = "down";
  } else if (health.data) {
    if (ready.isError || ready.data?.status === "degraded") {
      status = "degraded";
    } else if (ready.data?.status === "ok") {
      status = "healthy";
    } else {
      status = "healthy";
    }
  }

  return {
    status,
    version: health.data?.version,
    failures,
    checks,
    lastCheckedAt: health.data?.timestamp,
    refetch: () => {
      void health.refetch();
      void ready.refetch();
    },
    isFetching: health.isFetching || ready.isFetching,
  };
}

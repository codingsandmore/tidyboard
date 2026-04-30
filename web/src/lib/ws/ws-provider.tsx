"use client";

/**
 * WSProvider — real-time WebSocket connection for Tidyboard.
 *
 * Opens a WS connection to /v1/ws when the user is authenticated.
 * On incoming frames, invalidates the relevant React Query caches so
 * screens refresh without a full page reload.
 *
 * Reconnect policy: exponential backoff starting at 1s, doubling each
 * attempt, capped at 30s.
 *
 * Skipped entirely in SSR (typeof window === "undefined") and when
 * isApiFallbackMode() is true (no backend to connect to).
 */

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth/auth-store";
import { isApiFallbackMode } from "@/lib/api/fallback";

// ── Types ──────────────────────────────────────────────────────────────────

export type WSStatus = "connecting" | "open" | "closed" | "error" | "idle";

export type WSEvent = {
  type: string;
  household_id: string;
  payload: Record<string, unknown>;
  timestamp: string;
};

export type WSCtx = {
  status: WSStatus;
  reconnect(): void;
  lastEvent: WSEvent | null;
};

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Build a safe WebSocket URL from the HTTP API base URL.
 * - Strips trailing slashes
 * - Replaces http:// with ws:// and https:// with wss://
 * - Returns null in SSR or when apiUrl is empty
 */
function buildWsUrl(apiUrl: string, token: string): string | null {
  if (typeof window === "undefined") return null;
  if (!apiUrl) return null;

  const base = apiUrl.replace(/\/+$/, "");
  const wsBase = base
    .replace(/^https:\/\//, "wss://")
    .replace(/^http:\/\//, "ws://");

  return `${wsBase}/v1/ws?token=${encodeURIComponent(token)}`;
}

const BACKOFF_INITIAL_MS = 1_000;
const BACKOFF_MAX_MS = 30_000;

// ── Context ────────────────────────────────────────────────────────────────

const WSContext = createContext<WSCtx>({
  status: "idle",
  reconnect: () => {},
  lastEvent: null,
});

// ── Provider ───────────────────────────────────────────────────────────────

export function WSProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const queryClient = useQueryClient();

  const [status, setStatus] = useState<WSStatus>("idle");
  const [lastEvent, setLastEvent] = useState<WSEvent | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const backoffRef = useRef<number>(BACKOFF_INITIAL_MS);
  // Tracks whether we're intentionally closed (logout / unmount) to suppress reconnect
  const intentionalCloseRef = useRef<boolean>(false);
  // Bump to force a reconnect
  const [reconnectTick, setReconnectTick] = useState(0);

  const handleInvalidation = useCallback(
    (event: WSEvent) => {
      const t = event.type;

      if (t.startsWith("event.")) {
        queryClient.invalidateQueries({ queryKey: ["events"] });
        return;
      }

      if (t.startsWith("list.item.") || t === "list.item.toggled") {
        queryClient.invalidateQueries({ queryKey: ["lists"] });
        const listId =
          event.payload && typeof event.payload.list_id === "string"
            ? event.payload.list_id
            : null;
        if (listId) {
          queryClient.invalidateQueries({ queryKey: ["lists", listId] });
        }
        return;
      }

      if (t.startsWith("list.")) {
        queryClient.invalidateQueries({ queryKey: ["lists"] });
        const listId =
          event.payload && typeof event.payload.list_id === "string"
            ? event.payload.list_id
            : null;
        if (listId) {
          queryClient.invalidateQueries({ queryKey: ["lists", listId] });
        }
        return;
      }

      if (t.startsWith("routine.")) {
        queryClient.invalidateQueries({ queryKey: ["routines"] });
        return;
      }

      if (t.startsWith("shopping.")) {
        queryClient.invalidateQueries({ queryKey: ["shopping"] });
        return;
      }

      if (t.startsWith("meal_plan.")) {
        queryClient.invalidateQueries({ queryKey: ["meal-plan"] });
        return;
      }

      if (t.startsWith("recipe_collection.")) {
        queryClient.invalidateQueries({ queryKey: ["recipe-collections"] });
        return;
      }

      if (t.startsWith("equity.")) {
        queryClient.invalidateQueries({ queryKey: ["equity"] });
        return;
      }
    },
    [queryClient]
  );

  const reconnect = useCallback(() => {
    intentionalCloseRef.current = false;
    backoffRef.current = BACKOFF_INITIAL_MS;
    setReconnectTick((t) => t + 1);
  }, []);

  useEffect(() => {
    // SSR guard
    if (typeof window === "undefined") return;
    // Demo/fallback mode — no backend
    if (isApiFallbackMode()) return;
    // Not authenticated yet
    if (auth.status !== "authenticated" || !auth.token) {
      setStatus("idle");
      return;
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";
    const wsUrl = buildWsUrl(apiUrl, auth.token);
    if (!wsUrl) {
      setStatus("idle");
      return;
    }

    intentionalCloseRef.current = false;

    function connect() {
      if (intentionalCloseRef.current) return;

      let ws: WebSocket;
      try {
        ws = new WebSocket(wsUrl!);
      } catch {
        setStatus("error");
        scheduleRetry();
        return;
      }

      socketRef.current = ws;
      setStatus("connecting");

      ws.onopen = () => {
        backoffRef.current = BACKOFF_INITIAL_MS;
        setStatus("open");
      };

      ws.onmessage = (e: MessageEvent) => {
        try {
          const event = JSON.parse(e.data as string) as WSEvent;
          setLastEvent(event);
          handleInvalidation(event);
        } catch {
          // Ignore malformed frames
        }
      };

      ws.onerror = () => {
        setStatus("error");
      };

      ws.onclose = () => {
        if (!intentionalCloseRef.current) {
          setStatus("closed");
          scheduleRetry();
        } else {
          setStatus("idle");
        }
      };
    }

    function scheduleRetry() {
      if (intentionalCloseRef.current) return;
      const delay = backoffRef.current;
      backoffRef.current = Math.min(backoffRef.current * 2, BACKOFF_MAX_MS);
      retryTimerRef.current = setTimeout(connect, delay);
    }

    connect();

    return () => {
      intentionalCloseRef.current = true;
      if (retryTimerRef.current !== null) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
      if (socketRef.current) {
        socketRef.current.onclose = null;
        socketRef.current.onerror = null;
        socketRef.current.onopen = null;
        socketRef.current.onmessage = null;
        socketRef.current.close();
        socketRef.current = null;
      }
    };
    // reconnectTick triggers manual reconnect
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.status, auth.token, handleInvalidation, reconnectTick]);

  return (
    <WSContext.Provider value={{ status, reconnect, lastEvent }}>
      {children}
    </WSContext.Provider>
  );
}

export function useWS(): WSCtx {
  return useContext(WSContext);
}

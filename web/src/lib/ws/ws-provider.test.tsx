import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WSProvider, useWS } from "./ws-provider";
import { renderWithWS, makeTestQueryClient } from "@/test/utils";

// ── WebSocket stub ─────────────────────────────────────────────────────────

type WSHandler = (event: { data?: string; code?: number }) => void;

interface StubWS {
  onopen: WSHandler | null;
  onmessage: WSHandler | null;
  onerror: WSHandler | null;
  onclose: WSHandler | null;
  close: () => void;
  _triggerOpen: () => void;
  _triggerMessage: (data: string) => void;
  _triggerError: () => void;
  _triggerClose: (code?: number) => void;
  readyState: number;
}

let lastStubWS: StubWS | null = null;

function makeStubWebSocket() {
  const stub: StubWS = {
    onopen: null,
    onmessage: null,
    onerror: null,
    onclose: null,
    readyState: 0,
    close() {
      this.readyState = 3;
      // Don't call onclose here — intentional close clears handlers first
    },
    _triggerOpen() {
      this.readyState = 1;
      this.onopen?.({});
    },
    _triggerMessage(data: string) {
      this.onmessage?.({ data });
    },
    _triggerError() {
      this.onerror?.({});
    },
    _triggerClose(code?: number) {
      this.readyState = 3;
      this.onclose?.({ code });
    },
  };
  lastStubWS = stub;
  return stub;
}

// ── Auth mock ──────────────────────────────────────────────────────────────

const mockAuthState = {
  status: "authenticated" as "authenticated" | "unauthenticated" | "loading",
  token: "test-token",
  household: { id: "hh-1" } as { id: string } | null,
};

vi.mock("@/lib/auth/auth-store", () => ({
  useAuth: () => mockAuthState,
}));

// ── Fallback mock ──────────────────────────────────────────────────────────

vi.mock("@/lib/api/fallback", () => ({
  isApiFallbackMode: () => false,
}));

// ── Helpers ────────────────────────────────────────────────────────────────

/** Simple consumer exposing WS context via data-testid spans. */
function WSDisplay() {
  const { status, lastEvent, reconnect } = useWS();
  return (
    <div>
      <span data-testid="ws-status">{status}</span>
      <span data-testid="ws-last-event">
        {lastEvent ? JSON.stringify(lastEvent) : "null"}
      </span>
      <button data-testid="ws-reconnect" onClick={reconnect}>
        reconnect
      </button>
    </div>
  );
}

// ── Setup / teardown ───────────────────────────────────────────────────────

beforeEach(() => {
  vi.useFakeTimers();
  lastStubWS = null;
  mockAuthState.status = "authenticated";
  mockAuthState.token = "test-token";
  mockAuthState.household = { id: "hh-1" };
  vi.stubGlobal("WebSocket", vi.fn().mockImplementation(makeStubWebSocket));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// ── Tests ──────────────────────────────────────────────────────────────────

describe("WSProvider — connection lifecycle", () => {
  it("starts as 'connecting' when authenticated then transitions to 'open'", async () => {
    renderWithWS(<WSDisplay />);

    // Should start connecting
    expect(screen.getByTestId("ws-status").textContent).toBe("connecting");

    await act(async () => {
      lastStubWS?._triggerOpen();
    });

    expect(screen.getByTestId("ws-status").textContent).toBe("open");
  });

  it("stays 'idle' when not authenticated", async () => {
    mockAuthState.status = "unauthenticated";
    mockAuthState.token = null as unknown as string;

    renderWithWS(<WSDisplay />);

    await act(async () => {});
    expect(screen.getByTestId("ws-status").textContent).toBe("idle");
    expect(vi.mocked(global.WebSocket)).not.toHaveBeenCalled();
  });

  it("stays 'idle' for authenticated accounts that have not finished onboarding", async () => {
    mockAuthState.household = null;

    renderWithWS(<WSDisplay />);

    await act(async () => {});
    expect(screen.getByTestId("ws-status").textContent).toBe("idle");
    expect(vi.mocked(global.WebSocket)).not.toHaveBeenCalled();
  });

  it("closes the socket cleanly on unmount", async () => {
    const { unmount } = renderWithWS(<WSDisplay />);

    await act(async () => {
      lastStubWS?._triggerOpen();
    });

    const closeSpy = vi.spyOn(lastStubWS!, "close");
    unmount();
    expect(closeSpy).toHaveBeenCalled();
  });
});

describe("WSProvider — incoming events + query invalidation", () => {
  it("updates lastEvent on incoming message", async () => {
    renderWithWS(<WSDisplay />);

    await act(async () => {
      lastStubWS?._triggerOpen();
    });

    const frame = JSON.stringify({
      type: "event.created",
      household_id: "hh-1",
      payload: { id: "evt-1" },
      timestamp: "2026-04-22T10:00:00Z",
    });

    await act(async () => {
      lastStubWS?._triggerMessage(frame);
    });

    const display = screen.getByTestId("ws-last-event").textContent;
    expect(display).toContain("event.created");
    expect(display).toContain("hh-1");
  });

  it("invalidates ['events'] on event.* messages", async () => {
    const qc = makeTestQueryClient();
    const invalidateSpy = vi.spyOn(qc, "invalidateQueries");

    renderWithWS(<WSDisplay />, qc);

    await act(async () => {
      lastStubWS?._triggerOpen();
    });

    await act(async () => {
      lastStubWS?._triggerMessage(
        JSON.stringify({
          type: "event.created",
          household_id: "hh-1",
          payload: {},
          timestamp: "2026-04-22T10:00:00Z",
        })
      );
    });

    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ["events"] })
    );
  });

  it("invalidates ['lists'] and ['lists', list_id] on list.item.toggled", async () => {
    const qc = makeTestQueryClient();
    const invalidateSpy = vi.spyOn(qc, "invalidateQueries");

    renderWithWS(<WSDisplay />, qc);

    await act(async () => {
      lastStubWS?._triggerOpen();
    });

    await act(async () => {
      lastStubWS?._triggerMessage(
        JSON.stringify({
          type: "list.item.toggled",
          household_id: "hh-1",
          payload: { list_id: "list-abc" },
          timestamp: "2026-04-22T10:00:00Z",
        })
      );
    });

    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ["lists"] })
    );
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ["lists", "list-abc"] })
    );
  });

  it("invalidates ['lists'] on list.updated", async () => {
    const qc = makeTestQueryClient();
    const invalidateSpy = vi.spyOn(qc, "invalidateQueries");

    renderWithWS(<WSDisplay />, qc);

    await act(async () => {
      lastStubWS?._triggerOpen();
    });

    await act(async () => {
      lastStubWS?._triggerMessage(
        JSON.stringify({
          type: "list.updated",
          household_id: "hh-1",
          payload: { list_id: "list-xyz" },
          timestamp: "2026-04-22T10:00:00Z",
        })
      );
    });

    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ["lists"] })
    );
  });

  it("invalidates ['routines'] on routine.step.toggled", async () => {
    const qc = makeTestQueryClient();
    const invalidateSpy = vi.spyOn(qc, "invalidateQueries");

    renderWithWS(<WSDisplay />, qc);

    await act(async () => {
      lastStubWS?._triggerOpen();
    });

    await act(async () => {
      lastStubWS?._triggerMessage(
        JSON.stringify({
          type: "routine.step.toggled",
          household_id: "hh-1",
          payload: {},
          timestamp: "2026-04-22T10:00:00Z",
        })
      );
    });

    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ["routines"] })
    );
  });

  it("invalidates ['shopping'] on shopping.item.toggled", async () => {
    const qc = makeTestQueryClient();
    const invalidateSpy = vi.spyOn(qc, "invalidateQueries");

    renderWithWS(<WSDisplay />, qc);

    await act(async () => {
      lastStubWS?._triggerOpen();
    });

    await act(async () => {
      lastStubWS?._triggerMessage(
        JSON.stringify({
          type: "shopping.item.toggled",
          household_id: "hh-1",
          payload: {},
          timestamp: "2026-04-22T10:00:00Z",
        })
      );
    });

    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ["shopping"] })
    );
  });

  it("ignores malformed JSON frames without crashing", async () => {
    renderWithWS(<WSDisplay />);

    await act(async () => {
      lastStubWS?._triggerOpen();
    });

    await act(async () => {
      lastStubWS?._triggerMessage("not-json{{{");
    });

    // Should still be open, no crash
    expect(screen.getByTestId("ws-status").textContent).toBe("open");
  });
});

describe("WSProvider — reconnect on close", () => {
  it("sets status to 'closed' and schedules a reconnect after close", async () => {
    renderWithWS(<WSDisplay />);

    await act(async () => {
      lastStubWS?._triggerOpen();
    });

    expect(screen.getByTestId("ws-status").textContent).toBe("open");

    await act(async () => {
      lastStubWS?._triggerClose();
    });

    expect(screen.getByTestId("ws-status").textContent).toBe("closed");

    // Advance timer past initial 1s backoff — a new WS should be created
    await act(async () => {
      vi.advanceTimersByTime(1_100);
    });

    expect(vi.mocked(global.WebSocket)).toHaveBeenCalledTimes(2);
  });

  it("sets status to 'error' on socket error", async () => {
    renderWithWS(<WSDisplay />);

    await act(async () => {
      lastStubWS?._triggerOpen();
      lastStubWS?._triggerError();
    });

    expect(screen.getByTestId("ws-status").textContent).toBe("error");
  });

  it("manual reconnect resets backoff and opens new socket", async () => {
    renderWithWS(<WSDisplay />);

    await act(async () => {
      lastStubWS?._triggerOpen();
    });

    expect(vi.mocked(global.WebSocket)).toHaveBeenCalledTimes(1);

    // Trigger manual reconnect — this bumps reconnectTick which re-runs the effect
    await act(async () => {
      screen.getByTestId("ws-reconnect").click();
    });

    // The effect cleanup closes the old socket and opens a new one immediately
    expect(vi.mocked(global.WebSocket)).toHaveBeenCalledTimes(2);
  });
});

describe("WSProvider — auth logout closes socket", () => {
  it("closes socket when auth transitions to unauthenticated", async () => {
    const { rerender } = renderWithWS(<WSDisplay />);

    await act(async () => {
      lastStubWS?._triggerOpen();
    });

    expect(screen.getByTestId("ws-status").textContent).toBe("open");

    // Simulate logout by changing auth state and re-rendering
    mockAuthState.status = "unauthenticated";
    mockAuthState.token = null as unknown as string;

    const qc = makeTestQueryClient();
    rerender(
      <QueryClientProvider client={qc}>
        <WSProvider>
          <WSDisplay />
        </WSProvider>
      </QueryClientProvider>
    );

    await act(async () => {});

    // Status goes idle since no token
    expect(screen.getByTestId("ws-status").textContent).toBe("idle");
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

// ── Router mock ─────────────────────────────────────────────────────────────
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
  notFound: vi.fn(),
}));

// ── API mock — use vi.fn() inline (no top-level variable references) ────────
vi.mock("@/lib/api/client", () => ({
  api: {
    get: vi.fn().mockResolvedValue([]),
    post: vi.fn().mockResolvedValue({ status: "sent" }),
    patch: vi.fn().mockResolvedValue({ status: "ok" }),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("@/lib/api/fallback", () => ({
  isApiFallbackMode: () => false,
  fallback: {
    members: () => [],
    events: () => [],
    lists: () => [],
    recipes: () => [],
    shopping: () => ({ items: [] }),
    routines: () => [],
    equity: () => ({}),
    mealPlan: () => ({}),
    race: () => ({}),
    audit: () => ({ entries: [], total: 0 }),
    recipe: () => undefined,
    list: () => undefined,
  },
}));

// ── Hooks under test ────────────────────────────────────────────────────────
import { useUpdateMemberNotify, useTestNotification } from "@/lib/api/hooks";
import { api } from "@/lib/api/client";

function makeQC() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function wrap(ui: React.ReactElement) {
  const qc = makeQC();
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

// Minimal component that exercises useUpdateMemberNotify
function UpdateNotifyButton({ memberId }: { memberId: string }) {
  const mut = useUpdateMemberNotify(memberId);
  return (
    <button
      data-testid="update-btn"
      onClick={() =>
        mut.mutate({
          ntfyTopic: "test-topic",
          preferences: { events_enabled: true, lists_enabled: false, tasks_enabled: true },
        })
      }
    >
      Save
    </button>
  );
}

// Minimal component that exercises useTestNotification
function TestNotifyButton({ memberId }: { memberId: string }) {
  const mut = useTestNotification(memberId);
  return (
    <button data-testid="test-btn" onClick={() => mut.mutate()}>
      Test
    </button>
  );
}

describe("useUpdateMemberNotify", () => {
  beforeEach(() => {
    vi.mocked(api.patch).mockClear();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls PATCH /v1/members/:id/notify with the right body", async () => {
    wrap(<UpdateNotifyButton memberId="member-abc" />);
    fireEvent.click(screen.getByTestId("update-btn"));
    await waitFor(() => expect(vi.mocked(api.patch)).toHaveBeenCalledOnce());
    expect(vi.mocked(api.patch)).toHaveBeenCalledWith("/v1/members/member-abc/notify", {
      ntfy_topic: "test-topic",
      events_enabled: true,
      lists_enabled: false,
      tasks_enabled: true,
    });
  });
});

describe("useTestNotification", () => {
  beforeEach(() => {
    vi.mocked(api.post).mockClear();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls POST /v1/notify/test with the member_id", async () => {
    wrap(<TestNotifyButton memberId="member-xyz" />);
    fireEvent.click(screen.getByTestId("test-btn"));
    await waitFor(() => expect(vi.mocked(api.post)).toHaveBeenCalledOnce());
    expect(vi.mocked(api.post)).toHaveBeenCalledWith("/v1/notify/test", { member_id: "member-xyz" });
  });
});

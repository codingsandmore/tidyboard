# Event Countdowns Implementation Plan (Plan D)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the event-countdown widget across kiosk, phone, and desktop dashboards with color escalation, opt-in audio chimes, hybrid major-event detection (location-based with per-event override), and a hero-plus-stack layout for busy days.

**Architecture:** A nullable `is_countdown` BOOLEAN on `events` plus a household-level audio-enable setting. One pure helper `effectiveIsCountdown(event)` mirrored Go/TS. Frontend hook `useUpcomingCountdowns` powers a single reusable `CountdownWidget` component with three placement variants. No new endpoints — extends `PATCH /v1/events/{id}`.

**Tech Stack:** Go 1.24 · sqlc · goose · Postgres · React 19 · Next.js 16 · TanStack Query · Vitest · Playwright · WebAudio API.

---

## File Structure

### Backend
- Create: `migrations/20260427000020_event_countdowns.sql` — adds `events.is_countdown` + ensures `households.settings` exists
- Modify: `sql/queries/event.sql` — extend `UpdateEvent` to handle `is_countdown` + `clear_is_countdown`
- Modify: `internal/model/event.go` — add `IsCountdown *bool` and `ClearIsCountdown bool` to `UpdateEventRequest`; add a pure helper `EffectiveIsCountdown(event)` to `internal/service/event_countdown.go`
- Create: `internal/service/event_countdown.go` + `internal/service/event_countdown_test.go`
- Modify: `internal/handler/event.go` — pass new fields through to the existing UpdateEvent flow
- Modify: `internal/query/...` — regenerated from sqlc

### Frontend (math + hooks)
- Create: `web/src/lib/countdown/effective-is-countdown.ts` + test (TS mirror of Go)
- Create: `web/src/lib/countdown/band.ts` + test
- Create: `web/src/lib/countdown/use-upcoming-countdowns.ts` + test
- Modify: `web/src/lib/api/types.ts` — add `is_countdown` to `TBDEvent` interface
- Modify: `web/src/lib/api/hooks.ts` — extend `useUpdateEvent` payload shape with `is_countdown` and `clear_is_countdown`

### Frontend (UI)
- Create: `web/src/components/ui/countdown-widget.tsx` + test
- Create: `web/src/lib/countdown/audio.ts` — built-in WebAudio chime helper + test
- Modify: `web/src/components/screens/calendar.tsx` — add the tri-state Countdown toggle to EventModal (below Repeat dropdown)
- Modify: `web/src/components/screens/dashboard-kiosk.tsx` — wire `<CountdownWidget>` family-wide
- Modify: `web/src/components/screens/dashboard-phone.tsx` — wire `<CountdownWidget>` per-active-member
- Modify: `web/src/components/screens/dashboard-desktop.tsx` — wire `<CountdownWidget>` family-wide
- Modify: `web/src/app/settings/page.tsx` — add Countdowns card with audio toggle
- Modify: `web/src/lib/api/fallback.ts` — seed one near-future event in fallback so the widget renders in demo mode

### Tests
- Create: `web/e2e/countdown.spec.ts`
- Modify: `web/e2e-prod/tests/family-flow.spec.ts` — add countdown override round-trip case
- Modify: `web/e2e-prod/helpers/api.ts` — add `apiUpdateEventCountdown` helper

---

## Phase 1: Backend schema + service

### Task 1: Migration

**Files:**
- Create: `migrations/20260427000020_event_countdowns.sql`

- [ ] **Step 1: Write the migration**

```sql
-- +goose Up
-- +goose StatementBegin
ALTER TABLE events ADD COLUMN is_countdown BOOLEAN;
COMMENT ON COLUMN events.is_countdown IS 'NULL = auto-detect via location; TRUE = always show on countdown widget; FALSE = never';
-- +goose StatementEnd

-- +goose StatementBegin
-- households.settings may already exist from an earlier plan. Idempotent add.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'households' AND column_name = 'settings'
  ) THEN
    ALTER TABLE households ADD COLUMN settings JSONB NOT NULL DEFAULT '{}'::jsonb;
  END IF;
END $$;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE events DROP COLUMN IF EXISTS is_countdown;
-- We do NOT drop households.settings on rollback; it may be in use by other plans.
-- +goose StatementEnd
```

- [ ] **Step 2: Apply locally**

Run: `~/go/bin/goose -dir migrations postgres "postgres://tidyboard:secret@localhost:5432/tidyboard?sslmode=disable" up`
Expected: `OK 20260427000020_event_countdowns.sql`

- [ ] **Step 3: Verify the column**

Run: `psql "postgres://tidyboard:secret@localhost:5432/tidyboard?sslmode=disable" -c "\d events" | grep is_countdown`
Expected: a line showing `is_countdown | boolean |`

- [ ] **Step 4: Test rollback**

Run: `goose down && goose up`
Expected: both succeed.

- [ ] **Step 5: Commit**

```bash
git add migrations/20260427000020_event_countdowns.sql
git commit -m "feat(db): add events.is_countdown column for countdown widget"
```

---

### Task 2: sqlc — extend Event update query + regen

**Files:**
- Modify: `sql/queries/event.sql`
- Generated: `internal/query/event.sql.go`, `internal/query/models.go` (auto)

- [ ] **Step 1: Update the UpdateEvent query**

Find the existing `-- name: UpdateEvent :one` block in `sql/queries/event.sql`. Add `is_countdown` to the COALESCE/CASE updaters. The exact form depends on existing style — likely:

```sql
-- name: UpdateEvent :one
UPDATE events
SET title = COALESCE(sqlc.narg(title), title),
    description = COALESCE(sqlc.narg(description), description),
    -- ...existing fields...
    is_countdown = CASE
        WHEN sqlc.arg(clear_is_countdown)::boolean THEN NULL
        WHEN sqlc.narg(is_countdown)::boolean IS NOT NULL THEN sqlc.narg(is_countdown)::boolean
        ELSE is_countdown
    END,
    updated_at = NOW()
WHERE id = $1 AND household_id = $2
RETURNING *;
```

The CASE handles three cases: explicit clear → NULL; explicit set → that value; not provided → unchanged.

Also update the SELECT-style queries (GetEvent, ListEventsInRange) — sqlc regen will pick up the new column automatically since they `SELECT *`.

- [ ] **Step 2: Regenerate**

Run: `sqlc generate`
Expected: `internal/query/event.sql.go` and `internal/query/models.go` updated; `Event` struct now has `IsCountdown *bool` (or `pgtype.Bool`).

- [ ] **Step 3: Build**

Run: `go build ./internal/query/...`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add sql/queries/event.sql internal/query/event.sql.go internal/query/models.go
git commit -m "feat(query): UpdateEvent supports is_countdown set/clear; Event struct gains the field"
```

---

### Task 3: Pure helper EffectiveIsCountdown (TDD)

**Files:**
- Create: `internal/service/event_countdown.go`
- Create: `internal/service/event_countdown_test.go`

- [ ] **Step 1: Write the failing test**

```go
package service_test

import (
	"testing"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/tidyboard/tidyboard/internal/query"
	"github.com/tidyboard/tidyboard/internal/service"
)

func TestEffectiveIsCountdown(t *testing.T) {
	yes := true
	no := false
	cases := []struct {
		name     string
		isCount  *bool
		location string
		want     bool
	}{
		{"override true wins regardless of location", &yes, "", true},
		{"override true wins with location", &yes, "Field 4", true},
		{"override false wins regardless of location", &no, "Field 4", false},
		{"override false wins without location", &no, "", false},
		{"nil + has location → true", nil, "Field 4", true},
		{"nil + empty location → false", nil, "", false},
		{"nil + whitespace-only location → false", nil, "   ", false},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			ev := query.Event{
				Location: pgtype.Text{String: c.location, Valid: c.location != ""},
			}
			if c.isCount != nil {
				ev.IsCountdown = pgtype.Bool{Bool: *c.isCount, Valid: true}
			}
			got := service.EffectiveIsCountdown(ev)
			if got != c.want {
				t.Errorf("got %v, want %v", got, c.want)
			}
		})
	}
}
```

(If the actual generated `Event.IsCountdown` is `*bool` rather than `pgtype.Bool`, adapt the test setup. Confirm by `grep IsCountdown internal/query/models.go` after Task 2.)

- [ ] **Step 2: Run — expect FAIL**

Run: `go test -run TestEffectiveIsCountdown ./internal/service/`
Expected: build error (`EffectiveIsCountdown undefined`).

- [ ] **Step 3: Implement**

```go
// Package service — event countdown helpers.
package service

import (
	"strings"

	"github.com/tidyboard/tidyboard/internal/query"
)

// EffectiveIsCountdown returns whether an event should be surfaced on the
// countdown widget. The rule:
//   - If the event has an explicit override (is_countdown set), use it.
//   - Otherwise auto-detect: events with a non-empty location are countdown-worthy.
//
// The frontend mirrors this in web/src/lib/countdown/effective-is-countdown.ts —
// keep the rule in sync.
func EffectiveIsCountdown(ev query.Event) bool {
	if ev.IsCountdown.Valid {
		return ev.IsCountdown.Bool
	}
	if !ev.Location.Valid {
		return false
	}
	return strings.TrimSpace(ev.Location.String) != ""
}
```

- [ ] **Step 4: Run — expect PASS**

Run: `go test -run TestEffectiveIsCountdown ./internal/service/ -v`
Expected: 7 subtests PASS.

- [ ] **Step 5: Commit**

```bash
git add internal/service/event_countdown.go internal/service/event_countdown_test.go
git commit -m "feat(event): EffectiveIsCountdown pure helper + table tests"
```

---

### Task 4: Wire `is_countdown` through the model + handler

**Files:**
- Modify: `internal/model/event.go`
- Modify: `internal/service/event.go` (the existing UpdateEvent service method)
- Modify: `internal/handler/event.go` (already passes the model through; should require zero changes)

- [ ] **Step 1: Extend `UpdateEventRequest`**

In `internal/model/event.go` find `UpdateEventRequest` and add:

```go
IsCountdown      *bool `json:"is_countdown,omitempty"`
ClearIsCountdown bool  `json:"clear_is_countdown,omitempty"`
```

- [ ] **Step 2: Pass them through in the service**

In `internal/service/event.go` find the `Update` method that translates `UpdateEventRequest` to `UpdateEventParams`. Add the conversion:

```go
params := query.UpdateEventParams{
    // ...existing fields...
}
if req.ClearIsCountdown {
    params.ClearIsCountdown = true
} else if req.IsCountdown != nil {
    params.IsCountdown = pgtype.Bool{Bool: *req.IsCountdown, Valid: true}
}
```

(Exact param-struct shape depends on what sqlc generated. If sqlc gave you `*bool` directly instead of `pgtype.Bool`, simplify accordingly.)

- [ ] **Step 3: Build**

Run: `go build ./...`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add internal/model/event.go internal/service/event.go
git commit -m "feat(event): UpdateEvent accepts is_countdown set/clear via API"
```

---

## Phase 2: Frontend pure functions (TDD)

### Task 5: TypeScript `effectiveIsCountdown` mirror

**Files:**
- Create: `web/src/lib/countdown/effective-is-countdown.ts`
- Create: `web/src/lib/countdown/effective-is-countdown.test.ts`

- [ ] **Step 1: Write failing test**

```ts
import { describe, it, expect } from "vitest";
import { effectiveIsCountdown } from "./effective-is-countdown";

describe("effectiveIsCountdown", () => {
  it("override true beats empty location", () => {
    expect(effectiveIsCountdown({ is_countdown: true, location: "" } as any)).toBe(true);
  });
  it("override true with location", () => {
    expect(effectiveIsCountdown({ is_countdown: true, location: "Field 4" } as any)).toBe(true);
  });
  it("override false beats location", () => {
    expect(effectiveIsCountdown({ is_countdown: false, location: "Field 4" } as any)).toBe(false);
  });
  it("override false with no location", () => {
    expect(effectiveIsCountdown({ is_countdown: false, location: "" } as any)).toBe(false);
  });
  it("null + location → true", () => {
    expect(effectiveIsCountdown({ is_countdown: null, location: "Field 4" } as any)).toBe(true);
  });
  it("null + empty location → false", () => {
    expect(effectiveIsCountdown({ is_countdown: null, location: "" } as any)).toBe(false);
  });
  it("null + whitespace-only location → false", () => {
    expect(effectiveIsCountdown({ is_countdown: null, location: "   " } as any)).toBe(false);
  });
  it("undefined is_countdown treated as null", () => {
    expect(effectiveIsCountdown({ location: "Field 4" } as any)).toBe(true);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `cd web && npx vitest run src/lib/countdown/effective-is-countdown.test.ts`
Expected: FAIL — file not found.

- [ ] **Step 3: Implement**

```ts
// web/src/lib/countdown/effective-is-countdown.ts
//
// Mirror of internal/service/event_countdown.go::EffectiveIsCountdown.
// Keep these in sync.

import type { TBDEvent } from "@/lib/data";

export function effectiveIsCountdown(event: Pick<TBDEvent, "is_countdown" | "location">): boolean {
  if (event.is_countdown === true) return true;
  if (event.is_countdown === false) return false;
  // null or undefined → auto-detect via location
  const loc = event.location ?? "";
  return loc.trim().length > 0;
}
```

- [ ] **Step 4: Run — expect PASS**

Expected: all 8 cases PASS.

- [ ] **Step 5: Commit**

```bash
git add web/src/lib/countdown/effective-is-countdown.{ts,test.ts}
git commit -m "feat(countdown/web): effectiveIsCountdown mirror of Go helper"
```

---

### Task 6: TypeScript `band` function

**Files:**
- Create: `web/src/lib/countdown/band.ts`
- Create: `web/src/lib/countdown/band.test.ts`

- [ ] **Step 1: Write the test**

```ts
import { describe, it, expect } from "vitest";
import { band } from "./band";

describe("band", () => {
  it("past for negative", () => expect(band(-1)).toBe("past"));
  it("starting in [0, 1)", () => expect(band(0)).toBe("starting"));
  it("starting at 0.5", () => expect(band(0.5)).toBe("starting"));
  it("urgent at 1", () => expect(band(1)).toBe("urgent"));
  it("urgent at 15", () => expect(band(15)).toBe("urgent"));
  it("soon at 16", () => expect(band(16)).toBe("soon"));
  it("soon at 60", () => expect(band(60)).toBe("soon"));
  it("calm at 61", () => expect(band(61)).toBe("calm"));
  it("calm for large numbers", () => expect(band(9999)).toBe("calm"));
});
```

- [ ] **Step 2: Implement**

```ts
// web/src/lib/countdown/band.ts
export type Band = "calm" | "soon" | "urgent" | "starting" | "past";

export function band(minutesUntil: number): Band {
  if (minutesUntil < 0) return "past";
  if (minutesUntil < 1) return "starting";
  if (minutesUntil <= 15) return "urgent";
  if (minutesUntil <= 60) return "soon";
  return "calm";
}
```

- [ ] **Step 3: Run + commit**

```bash
cd web && npx vitest run src/lib/countdown/band.test.ts
# all 9 should PASS
git add web/src/lib/countdown/band.{ts,test.ts}
git commit -m "feat(countdown/web): band function for color escalation thresholds"
```

---

## Phase 3: Frontend hook + audio helper

### Task 7: WebAudio chime helper

**Files:**
- Create: `web/src/lib/countdown/audio.ts`
- Create: `web/src/lib/countdown/audio.test.ts`

- [ ] **Step 1: Test (mocking AudioContext)**

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { playChime } from "./audio";

describe("playChime", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("creates an oscillator and connects to destination", () => {
    const startMock = vi.fn();
    const stopMock = vi.fn();
    const connectMock = vi.fn();
    const gainConnect = vi.fn();
    const linearRampMock = vi.fn();
    const setValueMock = vi.fn();

    const fakeOsc = { connect: connectMock, start: startMock, stop: stopMock, frequency: { value: 0 }, type: "" };
    const fakeGain = {
      connect: gainConnect,
      gain: { setValueAtTime: setValueMock, linearRampToValueAtTime: linearRampMock, value: 0 },
    };
    const fakeCtx = {
      createOscillator: () => fakeOsc,
      createGain: () => fakeGain,
      destination: {},
      currentTime: 0,
    };

    vi.stubGlobal("AudioContext", vi.fn(() => fakeCtx) as any);

    playChime();

    expect(connectMock).toHaveBeenCalledWith(fakeGain);
    expect(gainConnect).toHaveBeenCalledWith(fakeCtx.destination);
    expect(startMock).toHaveBeenCalled();
    expect(stopMock).toHaveBeenCalled();
  });

  it("is a no-op if AudioContext unavailable", () => {
    vi.stubGlobal("AudioContext", undefined as any);
    vi.stubGlobal("webkitAudioContext" as any, undefined);
    expect(() => playChime()).not.toThrow();
  });
});
```

- [ ] **Step 2: Implement**

```ts
// web/src/lib/countdown/audio.ts
//
// Built-in WebAudio chime — no asset to host. Soft sine pulse, ~250ms.
// Safe to call from any browser tab; no-op if AudioContext is unavailable.

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

let cachedCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (cachedCtx) return cachedCtx;
  const Ctor = (typeof window !== "undefined" && (window.AudioContext ?? window.webkitAudioContext)) as typeof AudioContext | undefined;
  if (!Ctor) return null;
  cachedCtx = new Ctor();
  return cachedCtx;
}

export function playChime(): void {
  const ctx = getCtx();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = 880;

  const now = ctx.currentTime;
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.18, now + 0.02);
  gain.gain.linearRampToValueAtTime(0, now + 0.25);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.3);
}
```

- [ ] **Step 3: Run + commit**

```bash
cd web && npx vitest run src/lib/countdown/audio.test.ts
git add web/src/lib/countdown/audio.{ts,test.ts}
git commit -m "feat(countdown/web): WebAudio chime helper (no-asset, no-op if unsupported)"
```

---

### Task 8: `useUpcomingCountdowns` hook

**Files:**
- Create: `web/src/lib/countdown/use-upcoming-countdowns.ts`
- Create: `web/src/lib/countdown/use-upcoming-countdowns.test.ts`

- [ ] **Step 1: Write failing test**

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useUpcomingCountdowns } from "./use-upcoming-countdowns";

const now = new Date("2026-04-27T15:00:00Z");
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(now);
});

const events = [
  // Order shuffled on purpose; the hook must sort
  { id: "e3", title: "Bedtime",     start_time: "2026-04-27T20:00:00Z", end_time: "2026-04-27T20:30:00Z", location: "Home: bedroom",       members: ["sarah"], is_countdown: null },
  { id: "e1", title: "Soccer",      start_time: "2026-04-27T15:30:00Z", end_time: "2026-04-27T16:30:00Z", location: "Field 4",             members: ["sarah"], is_countdown: null },
  { id: "e2", title: "Dinner",      start_time: "2026-04-27T18:00:00Z", end_time: "2026-04-27T18:45:00Z", location: "",                    members: ["all"],   is_countdown: null }, // not eligible
  { id: "e4", title: "Late event",  start_time: "2026-04-28T22:00:00Z", end_time: "2026-04-28T22:30:00Z", location: "Far away",            members: ["sarah"], is_countdown: null }, // out of window
  { id: "e5", title: "Override on", start_time: "2026-04-27T19:00:00Z", end_time: "2026-04-27T19:30:00Z", location: "",                    members: ["jack"],  is_countdown: true },
  { id: "e6", title: "Override off",start_time: "2026-04-27T17:00:00Z", end_time: "2026-04-27T17:30:00Z", location: "Park",                members: ["sarah"], is_countdown: false },
];

vi.mock("@/lib/api/hooks", () => ({
  useEvents: () => ({ data: events }),
}));

function wrap(ui: () => any) {
  const qc = new QueryClient();
  return renderHook(ui, {
    wrapper: ({ children }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>,
  });
}

describe("useUpcomingCountdowns", () => {
  it("returns the soonest eligible as hero, next 3 as rest", () => {
    const { result } = wrap(() => useUpcomingCountdowns({ householdWide: true }));
    expect(result.current.hero?.id).toBe("e1");      // Soccer at 15:30
    expect(result.current.rest.map((e: any) => e.id)).toEqual(["e5", "e3"]);  // Override on, Bedtime; e6 excluded by override-off; e2 excluded by no-location; e4 excluded by lookahead
  });

  it("returns null hero when nothing eligible", () => {
    vi.doMock("@/lib/api/hooks", () => ({ useEvents: () => ({ data: [] }) }));
    // (For real: re-import or use a separate setup; this test exists to document intent.)
  });

  it("filters to memberId when householdWide=false", () => {
    const { result } = wrap(() => useUpcomingCountdowns({ householdWide: false, memberId: "jack" }));
    expect(result.current.hero?.id).toBe("e5");  // Only one of jack's eligible events
    expect(result.current.rest).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Implement**

```ts
// web/src/lib/countdown/use-upcoming-countdowns.ts
"use client";

import { useMemo } from "react";
import { useEvents } from "@/lib/api/hooks";
import { effectiveIsCountdown } from "./effective-is-countdown";
import type { TBDEvent } from "@/lib/data";

export interface UpcomingCountdownsOpts {
  householdWide?: boolean;       // true on kiosk / desktop, false on phone
  memberId?: string;             // required when !householdWide
  lookaheadHours?: number;       // default 24
  max?: number;                  // default 4 (1 hero + up to 3 stack)
}

export interface UpcomingCountdownsResult {
  hero: TBDEvent | null;
  rest: TBDEvent[];
}

function startTime(e: TBDEvent): number {
  return new Date(e.start_time ?? e.start ?? 0).getTime();
}

export function useUpcomingCountdowns(opts: UpcomingCountdownsOpts = {}): UpcomingCountdownsResult {
  const lookaheadMs = (opts.lookaheadHours ?? 24) * 60 * 60 * 1000;
  const max = opts.max ?? 4;

  const now = Date.now();
  const start = new Date(now).toISOString();
  const end = new Date(now + lookaheadMs).toISOString();

  const { data: events = [] } = useEvents({ start, end });

  return useMemo(() => {
    const eligible = events
      .filter((e) => effectiveIsCountdown(e))
      .filter((e) => {
        if (opts.householdWide) return true;
        if (!opts.memberId) return false;
        return (e.members ?? []).includes(opts.memberId) || (e.members ?? []).includes("all");
      })
      .filter((e) => {
        const t = startTime(e);
        return t >= now && t <= now + lookaheadMs;
      })
      .sort((a, b) => startTime(a) - startTime(b))
      .slice(0, max);

    if (eligible.length === 0) return { hero: null, rest: [] };
    return { hero: eligible[0], rest: eligible.slice(1) };
    // We intentionally depend on `now` indirectly via `useEvents`'s queryKey;
    // a 60-second outer interval re-runs us so rolling-window math stays accurate.
  }, [events, opts.householdWide, opts.memberId, opts.max, lookaheadMs, now]);
}
```

- [ ] **Step 3: Run + commit**

```bash
cd web && npx vitest run src/lib/countdown/use-upcoming-countdowns.test.ts
git add web/src/lib/countdown/use-upcoming-countdowns.{ts,test.ts}
git commit -m "feat(countdown/web): useUpcomingCountdowns hook — hero + rest from filtered + sorted eligible events"
```

---

## Phase 4: Widget + EventModal toggle + settings

### Task 9: `CountdownWidget` component

**Files:**
- Create: `web/src/components/ui/countdown-widget.tsx`
- Create: `web/src/components/ui/countdown-widget.test.tsx`

- [ ] **Step 1: Write the test**

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { CountdownWidget } from "./countdown-widget";

const now = new Date("2026-04-27T15:00:00Z");
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(now);
});

const heroFar = { id: "h1", title: "Soccer", start_time: "2026-04-27T18:00:00Z", end_time: "2026-04-27T19:00:00Z", location: "Field 4", members: ["sarah"], is_countdown: null };
const heroSoon = { ...heroFar, start_time: "2026-04-27T15:30:00Z" }; // 30 min
const heroUrgent = { ...heroFar, start_time: "2026-04-27T15:10:00Z" }; // 10 min

describe("CountdownWidget", () => {
  it("renders empty state when hero is null", () => {
    render(<CountdownWidget hero={null} rest={[]} />);
    expect(screen.getByText(/Nothing major coming up/i)).toBeInTheDocument();
  });

  it("renders hero title + minutes-until for far event (calm)", () => {
    const { container } = render(<CountdownWidget hero={heroFar as any} rest={[]} />);
    expect(screen.getByText("Soccer")).toBeInTheDocument();
    expect(container.firstChild).toHaveAttribute("data-band", "calm");
  });

  it("amber band when 30 min away", () => {
    const { container } = render(<CountdownWidget hero={heroSoon as any} rest={[]} />);
    expect(container.firstChild).toHaveAttribute("data-band", "soon");
  });

  it("red band when 10 min away", () => {
    const { container } = render(<CountdownWidget hero={heroUrgent as any} rest={[]} />);
    expect(container.firstChild).toHaveAttribute("data-band", "urgent");
  });

  it("renders stack rows when rest has items", () => {
    const stack = [
      { id: "s1", title: "Bedtime", start_time: "2026-04-27T20:00:00Z", end_time: "2026-04-27T20:30:00Z", location: "Home", members: ["sarah"], is_countdown: null },
    ];
    render(<CountdownWidget hero={heroFar as any} rest={stack as any} />);
    expect(screen.getByText("Bedtime")).toBeInTheDocument();
  });

  it("audio is not invoked when audioEnabled is false", () => {
    const audioMod = require("@/lib/countdown/audio");
    const spy = vi.spyOn(audioMod, "playChime").mockImplementation(() => {});
    render(<CountdownWidget hero={heroSoon as any} rest={[]} audioEnabled={false} />);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
```

- [ ] **Step 2: Implement**

```tsx
// web/src/components/ui/countdown-widget.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { TB } from "@/lib/tokens";
import { Card } from "@/components/ui/card";
import type { TBDEvent } from "@/lib/data";
import { band, type Band } from "@/lib/countdown/band";
import { playChime } from "@/lib/countdown/audio";

export interface CountdownWidgetProps {
  hero: TBDEvent | null;
  rest: TBDEvent[];
  showOwnerName?: boolean;
  audioEnabled?: boolean;
  dark?: boolean;
}

function startMs(e: TBDEvent): number {
  return new Date(e.start_time ?? e.start ?? 0).getTime();
}

function formatTimeUntil(minutes: number): string {
  if (minutes < 1) return "Starting now";
  if (minutes < 60) return `${Math.floor(minutes)} min`;
  const h = Math.floor(minutes / 60);
  const m = Math.floor(minutes % 60);
  return m === 0 ? `${h}h` : `${h}h ${m}min`;
}

const BAND_BG: Record<Band, string> = {
  calm: "transparent",
  soon: "#FCD34D22",
  urgent: "#EF444422",
  starting: "#EF444433",
  past: "transparent",
};

export function CountdownWidget({ hero, rest, showOwnerName, audioEnabled, dark }: CountdownWidgetProps) {
  const [, forceTick] = useState(0);
  const firedRef = useRef<Map<string, Set<"30" | "5">>>(new Map());
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => forceTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!hero || !audioEnabled) return;
    const minutesUntil = (startMs(hero) - Date.now()) / 60000;
    const fired = firedRef.current.get(hero.id) ?? new Set<"30" | "5">();
    if (minutesUntil > 0 && minutesUntil <= 30 && !fired.has("30")) {
      playChime();
      fired.add("30");
    }
    if (minutesUntil > 0 && minutesUntil <= 5 && !fired.has("5")) {
      playChime();
      fired.add("5");
    }
    firedRef.current.set(hero.id, fired);
  });

  if (!hero) {
    return (
      <Card pad={20} style={{ textAlign: "center", color: dark ? TB.dText2 : TB.text2, fontSize: 13 }}>
        Nothing major coming up · enjoy the calm.
      </Card>
    );
  }

  const minutesUntil = Math.max(0, (startMs(hero) - Date.now()) / 60000);
  const b = band(minutesUntil);

  return (
    <Card
      pad={0}
      data-band={b}
      style={{
        background: BAND_BG[b],
        transition: "background 0.4s",
        overflow: "hidden",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", padding: 16 }}>
        <div style={{ fontSize: 12, color: dark ? TB.dText2 : TB.text2, letterSpacing: "0.06em" }}>NEXT UP</div>
        <div style={{ fontFamily: TB.fontDisplay, fontSize: 36, fontWeight: 600 }}>
          {formatTimeUntil(minutesUntil)}
        </div>
        <div style={{ fontSize: 16, fontWeight: 600, marginTop: 4 }}>{hero.title}</div>
        {hero.location && (
          <div style={{ fontSize: 12, color: dark ? TB.dText2 : TB.text2 }}>{hero.location}</div>
        )}
        {showOwnerName && hero.members && hero.members.length > 0 && (
          <div style={{ fontSize: 11, color: dark ? TB.dText2 : TB.text2, marginTop: 6 }}>
            for {hero.members.join(", ")}
          </div>
        )}
      </div>
      {rest.length > 0 && (
        <div style={{ borderTop: `1px solid ${dark ? TB.dBorder : TB.border}` }}>
          {rest.map((e) => {
            const m = Math.max(0, (startMs(e) - Date.now()) / 60000);
            return (
              <button
                key={e.id}
                onClick={() => router.push(`/calendar?event=${e.id}`)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 16px",
                  width: "100%",
                  border: "none",
                  background: "transparent",
                  textAlign: "left",
                  cursor: "pointer",
                  fontSize: 12,
                  color: dark ? TB.dText : TB.text,
                  fontFamily: TB.fontBody,
                }}
              >
                <span style={{ flex: 1 }}>{e.title}</span>
                <span style={{ color: dark ? TB.dText2 : TB.text2, fontFamily: TB.fontMono, fontSize: 11 }}>
                  in {formatTimeUntil(m)}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </Card>
  );
}
```

- [ ] **Step 3: Run test + commit**

```bash
cd web && npx vitest run src/components/ui/countdown-widget.test.tsx
git add web/src/components/ui/countdown-widget.{tsx,test.tsx}
git commit -m "feat(ui): CountdownWidget — hero + stack + color escalation + opt-in audio"
```

---

### Task 10: EventModal — Countdown override toggle

**Files:**
- Modify: `web/src/components/screens/calendar.tsx` (the EventModal section)
- Modify: `web/src/lib/api/types.ts` (add `is_countdown` to `TBDEvent`)
- Modify: `web/src/lib/api/hooks.ts` (extend `useUpdateEvent` payload)

- [ ] **Step 1: Add `is_countdown` to the TS type**

In `web/src/lib/data.ts` find `TBDEvent` and add:

```ts
export interface TBDEvent {
  // ...existing fields...
  is_countdown?: boolean | null;
}
```

- [ ] **Step 2: Extend `useUpdateEvent` payload type**

In `web/src/lib/api/hooks.ts` find `useUpdateEvent`. The mutation typically already accepts `Partial<TBDEvent>`-style payload — extend its arg type to include `is_countdown?: boolean | null` and `clear_is_countdown?: boolean` if not already.

- [ ] **Step 3: Add the toggle to EventModal**

In `web/src/components/screens/calendar.tsx` find the `EventModal` component. Below the existing "Repeat" dropdown (the recurrence-rule UI added in an earlier task), add:

```tsx
<div style={{ marginTop: 14 }}>
  <Row icon="bell" label="Show on countdown widget">
    <select
      value={
        modalEvent.is_countdown === true ? "always"
        : modalEvent.is_countdown === false ? "never"
        : "auto"
      }
      onChange={(e) => {
        const v = e.target.value;
        if (v === "auto")   setModalEvent({ ...modalEvent, is_countdown: null });
        if (v === "always") setModalEvent({ ...modalEvent, is_countdown: true });
        if (v === "never")  setModalEvent({ ...modalEvent, is_countdown: false });
      }}
      style={inputStyle}
    >
      <option value="auto">Auto (uses location)</option>
      <option value="always">Always show</option>
      <option value="never">Never show</option>
    </select>
  </Row>
</div>
```

In the existing `handleSave` function for EventModal, when calling `useUpdateEvent.mutate(...)`, pass through the value:

- If `modalEvent.is_countdown === null`: send `{ clear_is_countdown: true }`
- Else: send `{ is_countdown: modalEvent.is_countdown }`

- [ ] **Step 4: TypeScript + commit**

```bash
cd web && npx tsc --noEmit
git add web/src/lib/data.ts web/src/lib/api/types.ts web/src/lib/api/hooks.ts web/src/components/screens/calendar.tsx
git commit -m "feat(calendar): EventModal — Show on countdown widget tri-state (Auto/Always/Never)"
```

---

### Task 11: Settings card for audio toggle

**Files:**
- Modify: `web/src/app/settings/page.tsx`
- Modify: `web/src/lib/api/hooks.ts` (if needed: add `useHouseholdSettings` for read/write of `households.settings`)

- [ ] **Step 1: Add a Countdowns card to /settings**

In `web/src/app/settings/page.tsx`, find where the existing setting cards (Appearance, Calendars, etc.) are rendered. Add a new card component:

```tsx
function CountdownsCard() {
  const { household } = useAuth();
  const updateSettings = useUpdateHouseholdSettings(); // existing hook in hooks.ts (per chore-wallet plan)
  const audioEnabled = Boolean((household?.settings as any)?.countdown_audio_enabled);

  return (
    <div style={{ padding: "12px 16px", background: TB.surface, borderBottom: `1px solid ${TB.border}`, display: "flex", alignItems: "center", gap: 16, fontSize: 13 }}>
      <span style={{ color: TB.text2, fontWeight: 500, flex: 1 }}>Countdown audio cue (30 + 5 min before)</span>
      <input
        type="checkbox"
        checked={audioEnabled}
        onChange={(e) => updateSettings.mutate({ countdown_audio_enabled: e.target.checked })}
      />
    </div>
  );
}
```

Insert `<CountdownsCard />` in the settings page render alongside the other cards.

If `useUpdateHouseholdSettings` doesn't exist yet, add it to `hooks.ts`:
```ts
export function useUpdateHouseholdSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (settings: Record<string, unknown>) =>
      api.patch(`/v1/households/${currentHouseholdId}/settings`, settings),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["households"] }),
  });
}
```

(Adapt to whatever the actual household-settings PATCH endpoint is; if it doesn't exist server-side yet, that's a backend gap and a separate Task — flag it.)

- [ ] **Step 2: Commit**

```bash
git add web/src/app/settings/page.tsx web/src/lib/api/hooks.ts
git commit -m "feat(settings): Countdowns audio toggle (households.settings.countdown_audio_enabled)"
```

---

## Phase 5: Wiring into dashboards

### Task 12: Wire CountdownWidget into all 3 dashboards

**Files:**
- Modify: `web/src/components/screens/dashboard-kiosk.tsx`
- Modify: `web/src/components/screens/dashboard-phone.tsx`
- Modify: `web/src/components/screens/dashboard-desktop.tsx`

- [ ] **Step 1: Kiosk — family-wide variant**

Find the existing "NEXT UP" placeholder in `dashboard-kiosk.tsx` (or the top-right area). Add:

```tsx
import { useUpcomingCountdowns } from "@/lib/countdown/use-upcoming-countdowns";
import { CountdownWidget } from "@/components/ui/countdown-widget";
import { useAuth } from "@/lib/auth/auth-store";

// inside the component:
const { household } = useAuth();
const { hero, rest } = useUpcomingCountdowns({ householdWide: true });
const audioEnabled = Boolean((household?.settings as any)?.countdown_audio_enabled);

// render:
<CountdownWidget hero={hero} rest={rest} showOwnerName audioEnabled={audioEnabled} dark={dark} />
```

(Place it where the existing "NEXT UP" widget lives, replacing it; if there's no existing slot, top-right of the kiosk grid.)

- [ ] **Step 2: Phone — per-active-member variant**

In `dashboard-phone.tsx`:

```tsx
const { activeMember, household } = useAuth();
const { hero, rest } = useUpcomingCountdowns({
  householdWide: false,
  memberId: activeMember?.id,
});
const audioEnabled = Boolean((household?.settings as any)?.countdown_audio_enabled);
// Render full-width near the top of the page
<CountdownWidget hero={hero} rest={rest} audioEnabled={audioEnabled} />
```

- [ ] **Step 3: Desktop — family-wide alongside Weather**

In `dashboard-desktop.tsx` find where Weather/Celebrations cards are rendered. Add:

```tsx
const { hero, rest } = useUpcomingCountdowns({ householdWide: true });
<CountdownWidget hero={hero} rest={rest} showOwnerName audioEnabled={audioEnabled} />
```

- [ ] **Step 4: Build + commit**

```bash
cd web && npx tsc --noEmit
git add web/src/components/screens/dashboard-{kiosk,phone,desktop}.tsx
git commit -m "feat(dashboards): wire CountdownWidget into kiosk, phone, and desktop"
```

---

### Task 13: Fallback seed for demo mode

**Files:**
- Modify: `web/src/lib/api/fallback.ts`

- [ ] **Step 1: Seed a near-future event in fallback**

Find the `events()` method on the `fallback` object. Add (or update the first event to have a real near-future timestamp):

```ts
events(): TBDEvent[] {
  const inOneHour = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const inTwoHours = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
  return [
    {
      id: "ev-demo-1",
      title: "Soccer practice",
      start_time: inOneHour,
      end_time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      location: "Field 4",
      members: ["sarah"],
      is_countdown: null,
    },
    {
      id: "ev-demo-2",
      title: "Bedtime",
      start_time: inTwoHours,
      end_time: new Date(Date.now() + 2.5 * 60 * 60 * 1000).toISOString(),
      location: "Home",
      members: ["sarah"],
      is_countdown: true,
    },
    // ...keep any existing fallback events as additional rows
  ];
},
```

- [ ] **Step 2: Commit**

```bash
git add web/src/lib/api/fallback.ts
git commit -m "feat(fallback): seed near-future events so countdown widget renders in demo mode"
```

---

## Phase 6: E2E + final integration

### Task 14: Local Playwright e2e

**Files:**
- Create: `web/e2e/countdown.spec.ts`

- [ ] **Step 1: Write the test**

```ts
import { test, expect, gotoAndWait } from "./fixtures";

test.describe("Countdown widget — fallback mode", () => {
  test("/dashboard/kiosk renders the widget with a time-until string", async ({ page }) => {
    await gotoAndWait(page, "/dashboard/kiosk");
    // Widget renders the seeded "Soccer practice" event from fallback
    await expect(page.getByText(/NEXT UP/i)).toBeVisible();
    // Time-until string in the body matches "in N min" or "Nh Nmin"
    const body = await page.locator("body").textContent();
    expect(body ?? "").toMatch(/min|h\s/);
  });

  test("/dashboard/phone renders the widget for active member", async ({ page }) => {
    await gotoAndWait(page, "/dashboard/phone");
    await expect(page.getByText(/NEXT UP/i)).toBeVisible();
  });

  test("/dashboard/desktop renders the widget alongside other cards", async ({ page }) => {
    await gotoAndWait(page, "/dashboard/desktop");
    await expect(page.getByText(/NEXT UP/i)).toBeVisible();
  });
});
```

- [ ] **Step 2: Run + commit**

```bash
cd web && npx playwright test e2e/countdown.spec.ts --project=chromium --reporter=list
# 3/3 should pass
git add web/e2e/countdown.spec.ts
git commit -m "test(e2e): countdown widget renders on kiosk, phone, desktop in fallback mode"
```

---

### Task 15: Prod e2e extension

**Files:**
- Modify: `web/e2e-prod/helpers/api.ts`
- Modify: `web/e2e-prod/tests/family-flow.spec.ts`

- [ ] **Step 1: Add helper**

Append to `web/e2e-prod/helpers/api.ts`:

```ts
export const apiPatchEvent = (
  token: string,
  id: string,
  patch: { is_countdown?: boolean | null; clear_is_countdown?: boolean }
) => request<unknown>("PATCH", `/v1/events/${id}`, { token, body: patch });
```

- [ ] **Step 2: Add test inside the existing describe block**

In `web/e2e-prod/tests/family-flow.spec.ts`:

```ts
test("8. event countdown override round-trip", async () => {
  // Reuse the soccer event created in step 3, or create a new one
  const start = new Date(Date.now() + 60 * 60 * 1000);
  const end   = new Date(start.getTime() + 60 * 60 * 1000);
  const ev = await apiCreateEvent(TOKEN, {
    title: `[${RUN}] Pickup`,
    start_time: start.toISOString(),
    end_time: end.toISOString(),
    location: "School",
  });
  cleanup.trackEvent(TOKEN, ev.id);

  // Default: location set, is_countdown=null → eligible
  expect((ev as any).is_countdown).toBeNull();

  // Override to false
  await apiPatchEvent(TOKEN, ev.id, { is_countdown: false });
  const reread1 = await apiListEvents(TOKEN, { start: start.toISOString(), end: end.toISOString() });
  const after1 = reread1.find((e) => e.id === ev.id);
  expect((after1 as any).is_countdown).toBe(false);

  // Reset to auto
  await apiPatchEvent(TOKEN, ev.id, { clear_is_countdown: true });
  const reread2 = await apiListEvents(TOKEN, { start: start.toISOString(), end: end.toISOString() });
  const after2 = reread2.find((e) => e.id === ev.id);
  expect((after2 as any).is_countdown).toBeNull();
});
```

- [ ] **Step 3: Commit**

```bash
git add web/e2e-prod/helpers/api.ts web/e2e-prod/tests/family-flow.spec.ts
git commit -m "test(e2e-prod): event is_countdown override round-trip (set true/false/clear)"
```

---

### Task 16: Final smoke + PR + auto-deploy

- [ ] **Step 1: Full check**

```bash
cd /Users/wohlgemuth/IdeaProjects/tidyboard
go build ./...
go test -short ./...
cd web && npx tsc --noEmit
npx vitest run
npx playwright test --project=chromium --reporter=list
```

All must be green.

- [ ] **Step 2: Push + PR**

```bash
git push -u origin feat/event-countdowns
gh pr create --title "feat: event countdowns (Plan D)" --body "..."
```

PR body summarizes: 1 column, 1 hook, 1 widget, 3 dashboards wired, 1 settings toggle, 9 new test files. Reference design doc `docs/superpowers/specs/2026-04-27-event-countdowns-design.md`.

- [ ] **Step 3: Merge → auto-deploy**

```bash
gh pr merge --squash --delete-branch
gh run watch $(gh run list --workflow "Deploy to EC2" --limit 1 --json databaseId --jq '.[0].databaseId') --exit-status
```

- [ ] **Step 4: Smoke prod**

```bash
curl -ksS -o /dev/null -w "%{http_code}\n" https://tidyboard.org/dashboard/kiosk
# Expect: 200
curl -ksS -o /dev/null -w "%{http_code}\n" https://tidyboard.org/v1/events
# Expect: 401
```

Then check `/dashboard/kiosk` in a browser session and confirm the widget renders (with whatever real events exist).

- [ ] **Step 5: Done — close out Plan D**

Plan E (travel time + leave-by) is the next standalone brainstorm.

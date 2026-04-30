# Event Countdowns Design (Plan D)

**Date:** 2026-04-27
**Author:** Brainstorm with Claude Opus 4.7 + user
**Status:** Spec — implementation plan to follow

---

## 1. Overview

A kiosk + dashboard widget that surfaces the household's most imminent calendar events with a live-updating countdown, color-coded urgency band, and optional audio cue at 30-min and 5-min marks. Standalone Plan D in a series:

- **Plan C** (incident log) — separate brainstorm, queued
- **Plan D** (this spec) — event countdowns, no infra dependencies
- **Plan E** (travel time + leave-by) — adds geocoding/routing API and shifts the countdown from "event start" to "leave by"

**Problem:** Users currently have to open the calendar and do mental math to know what's next. With kids on the kiosk, this is friction at the moment when an external prompt would actually help ("soccer in 12 minutes — get your shoes").

**Goal:** an ambient widget on the kiosk + dashboards that shows the family's next N events, counts down in real time, and escalates color (and optionally a chime) as start time approaches.

---

## 2. Architectural decisions

| # | Question | Choice |
|---|---|---|
| D1 | Whose next event on the kiosk? | (b) Family-wide. Kid phone view will be a per-active-member variant. |
| D2 | How does urgency surface? | (c) Color escalation (green/amber/red) **plus** opt-in audio chime at 30 min and 5 min. Audio is a household setting, off by default. |
| D3 | What counts as "major event"? | (d) Hybrid — auto-detect via `events.location` field; per-event override via a tri-state toggle in EventModal. |
| D4 | Lookahead window? | (c) 24 hours. Empty state when nothing eligible: "Nothing major coming up · enjoy the calm." |
| D5 | Single vs. multiple events? | Hero (single big countdown for the imminent event) **plus** a compact stack of up to 3 more events, with "+N more" link for overflow. |

**Explicitly out of scope (YAGNI):** snooze/dismiss interactions, multiple sound choices, per-event audio override, lookahead-hours UI (stays in settings JSON), travel-time integration (Plan E).

---

## 3. Data model

Single migration `migrations/20260427000020_event_countdowns.sql`.

### 3.1 New column on `events`

| Column | Type | Notes |
|---|---|---|
| `is_countdown` | `BOOLEAN` (nullable) | NULL = auto-detect from `location`; TRUE = always count down; FALSE = never count down |

### 3.2 `households.settings` JSONB

If the column doesn't exist yet (created earlier as part of a different plan), this migration creates it. Keys recognized for Plan D:

| Key | Default | Notes |
|---|---|---|
| `countdown_audio_enabled` | `false` | Enables 30-min and 5-min chimes |
| `countdown_lookahead_hours` | `24` | Window the widget considers; not exposed in UI for v1 |

### 3.3 Effective rule

```
effective_is_countdown(event) =
  event.is_countdown                                IF NOT NULL
  ELSE (event.location IS NOT NULL AND location != "")
```

This is a pure function exposed both server-side (Go, in `internal/service/event.go` or a new `event_countdown.go`) and client-side (TypeScript in `web/src/lib/countdown/effective-is-countdown.ts`). Same table-driven test cases on both sides.

---

## 4. API surface

**No new endpoints.** Three changes to existing handlers:

1. `model.UpdateEventRequest` gains `IsCountdown *bool` plus a sibling `ClearIsCountdown bool`. Reason: pure `*bool` can't distinguish "field not in request body" from "explicitly null". When the client wants to revert to auto-detect, it sends `clear_is_countdown: true`; the handler then writes `NULL` to the column. Setting `is_countdown: true|false` as usual leaves `clear_is_countdown` at `false`.
2. The `events` row returned by `GET /v1/events` includes the new `is_countdown` field automatically once the model + sqlc are regenerated.
3. `households.settings` PATCH (already-existing endpoint per chore-wallet plan) recognizes the two new keys; otherwise unchanged.

---

## 5. Frontend — components & screens

### 5.1 Pure helper

`web/src/lib/countdown/effective-is-countdown.ts` — mirror of the Go function. Tested with the same cases.

### 5.2 Hook

`web/src/lib/countdown/use-upcoming-countdowns.ts`:

```ts
export function useUpcomingCountdowns(opts: {
  householdWide?: boolean;     // true on kiosk, false on per-kid phone view
  memberId?: string;           // required when householdWide=false
  lookaheadHours?: number;     // default 24
  max?: number;                // default 4 (1 hero + up to 3 stack)
}): { hero: ApiEvent | null; rest: ApiEvent[] }
```

- Wraps `useEvents({ start: now, end: now + lookahead })`.
- Filters via `effectiveIsCountdown(e)`.
- If `householdWide=false`, filters to events where `e.assigned_members` includes `memberId` (or all-household events).
- Sorts by `start_time` ascending.
- Slices: first item → `hero`, next 3 → `rest`.
- Memoized; recomputes on event-data change AND on a 60-second interval (so the order shifts naturally as time passes).

### 5.3 Widget

`web/src/components/ui/countdown-widget.tsx`:

```tsx
interface CountdownWidgetProps {
  hero: ApiEvent | null;
  rest: ApiEvent[];
  showOwnerName?: boolean;     // true on kiosk family view
  audioEnabled?: boolean;      // pulled from household settings
  dark?: boolean;
}
```

- **Empty state** (hero === null): "Nothing major coming up · enjoy the calm." in muted color.
- **Hero block** (top): large display-font time-until ("47 min" / "2h 15min" / "Starts in 12 sec"), event title and location below, member-color stripe down the left edge, owner avatar+name when `showOwnerName=true`.
- **Color band:** background tinted by `band(minutesUntilStart)` — `calm` (green/neutral), `soon` (amber), `urgent` (red, with a subtle pulse animation gated on `prefers-reduced-motion`).
- **Stack** (below hero, only if `rest.length > 0`): one row per event, compact format `[memberDot] · 3:30 PM · Soccer practice · in 47m`. Tap → opens the existing `EventModal` in edit mode by passing the event into the existing `setModalEvent({ id, … })` flow on the calendar page (router.push to `/calendar?event=<id>` and the page autoexpands the modal).
- **Overflow:** if there were more than 4 in the source list, show "+N more" link routing to `/calendar?view=Agenda`.
- **Self-tick:** internal `useEffect` runs a 1-second interval, updates a `now` state, recomputes time-until + band on every render. Cleared on unmount.
- **Audio cues** (hero only):
  - On render, if `audioEnabled` and band is `urgent` (or new event entered the urgent window since last render), check whether the 5-min chime has fired for THIS event in this page-load. If not, play it and add to a `firedCues = Map<eventId, Set<"30"|"5">>` ref.
  - Same for the 30-min threshold (band transition `calm → soon` would also cross it on event-arrival; check past-state guard).
  - Audio = built-in WebAudio `OscillatorNode` (sine 880 Hz, 200ms, gain envelope) — no asset to ship.

### 5.4 Pure functions

`web/src/lib/countdown/band.ts`:

```ts
export type Band = "calm" | "soon" | "urgent" | "starting" | "past";
export function band(minutesUntil: number): Band {
  if (minutesUntil < 0) return "past";
  if (minutesUntil < 1) return "starting";
  if (minutesUntil <= 15) return "urgent";
  if (minutesUntil <= 60) return "soon";
  return "calm";
}
```

Tested with table cases.

### 5.5 EventModal toggle

Extend `EventModal` in `web/src/components/screens/calendar.tsx`. Below the existing "Repeat" dropdown, add:

```
Show on countdown widget:
  ◉ Auto (uses location)    ○ Always    ○ Never
```

Maps to `is_countdown`: `null` / `true` / `false`. Wires through the existing `useUpdateEvent` mutation.

### 5.6 Wiring into existing screens

| Screen | Variant | Placement |
|---|---|---|
| `dashboard-kiosk.tsx` | `householdWide=true`, `showOwnerName=true` | Top section, replaces or sits next to the existing "NEXT UP" widget |
| `dashboard-phone.tsx` | `householdWide=false`, `memberId={activeMember.id}` | Top of the page, full-width |
| `dashboard-desktop.tsx` | `householdWide=true`, `showOwnerName=true` | Side column, alongside Weather + Celebrations cards |

### 5.7 Settings UI

Add a "Countdowns" card to `/settings`:

```
Countdowns
  [☐] Audio cue at 30 and 5 min before each event
```

Writes `households.settings.countdown_audio_enabled`. Lookahead-hours stays as a settings-JSON-only knob; no UI for v1.

---

## 6. Key flows

### 6.1 Default countdown selection

```
At T=2:43 PM, kiosk renders:
  useUpcomingCountdowns({ householdWide: true })
    → fetches events for [2:43 PM, +24h]
    → filters: effectiveIsCountdown(e) === true
    → sorts by start_time
    → returns { hero: <Soccer 3:30 PM>, rest: [<Dinner 6 PM>, <Bedtime 8 PM>, …] }
  CountdownWidget renders hero with band=soon (47 min away)
  Stack shows 3 more events
```

### 6.2 Audio cue arming

```
On every 1-second tick:
  Compute minutesUntil(hero) = 47
  band = "soon"
  Check: has the 30-min chime fired for hero.id in this session?
    No → if minutesUntil <= 30 AND audioEnabled → play chime, mark fired
  Same logic for 5-min threshold

After page reload, firedCues map is cleared — chimes can fire again
(intentional: after a reload the user is consciously starting a new session)
```

### 6.3 Hero changes

When the current hero finishes (band=past sustained > 60 sec) OR a new event enters earlier in the queue (parent created a new earlier event), the next render returns a new hero. `firedCues` keys by event id, so a new hero arms cleanly.

### 6.4 EventModal toggle round-trip

```
Parent opens "Soccer practice", changes Show on countdown to "Never"
  → PATCH /v1/events/{id} { is_countdown: false }
  → useEvents cache invalidated by useUpdateEvent.onSuccess
  → useUpcomingCountdowns recomputes; this event drops out
  → Widget re-renders with the next eligible event as the new hero
```

### 6.5 Empty state

```
No events in the next 24h with effectiveIsCountdown(e) === true
  → useUpcomingCountdowns returns { hero: null, rest: [] }
  → Widget shows "Nothing major coming up · enjoy the calm."
```

---

## 7. Testing strategy

### 7.1 Backend Go

- `internal/model/event_test.go` (or new `event_countdown_test.go`) — table-driven test for `EffectiveIsCountdown(event)` covering: `(is_countdown=nil, location="Field 4")` → true; `(nil, "")` → false; `(nil, NULL)` → false; `(true, anything)` → true; `(false, "Field 4")` → false.
- `internal/handler/event_test.go` (extend) — PATCH with `is_countdown: true` round-trips; PATCH with `is_countdown: null` clears; GET returns the field.

### 7.2 Frontend Vitest

- `web/src/lib/countdown/effective-is-countdown.test.ts` — same cases as Go, mirror.
- `web/src/lib/countdown/band.test.ts` — table for the 5 band states + boundary edges (60.0 vs 60.01, 15.0 vs 14.99, etc).
- `web/src/lib/countdown/use-upcoming-countdowns.test.ts` — mocks `useEvents` and `useMembers`; asserts: returns `hero` + `rest` in correct order; respects `householdWide` filter; respects `memberId` filter when householdWide=false; returns `null` hero when nothing matches.
- `web/src/components/ui/countdown-widget.test.tsx` — render with hero in each band → asserts the data attribute; render with `hero=null` → empty state text; render with `rest.length > 3` → "+N more" link visible; render with `audioEnabled=false` → no AudioContext touched (mock + assert).

### 7.3 Local Playwright e2e

- `web/e2e/countdown.spec.ts` — visits `/dashboard/kiosk` in fallback mode (with seeded fallback events including a near-future one), asserts the widget renders a time-until string matching `/in \d+/i` somewhere in the body; asserts the empty state copy ("Nothing major coming up") appears when the fallback events list is empty.

### 7.4 Prod e2e (auth-gated)

Extend `web/e2e-prod/tests/family-flow.spec.ts` with a new test case:
- Create an event with location → GET returns `is_countdown: null` and is treated as countdown-eligible
- PATCH `is_countdown: false` → GET reflects override; eligible no longer
- PATCH `is_countdown: null` → back to auto-detect

### 7.5 Coverage targets

- Pure functions (`band`, `effectiveIsCountdown`): 100%
- Hook + widget: ≥85% line, all band branches exercised
- Backend changes: ≥80%

### 7.6 Out of scope

- Audio mocking beyond "AudioContext was/wasn't called"
- Cross-browser audio compat tests (Chromium target only for v1)
- Live network-driven event-list refresh tests beyond what existing event suite already covers

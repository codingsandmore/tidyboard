# Design: Event Assignment, Meal-Plan Completion, Error Surfacing

**Date:** 2026-04-30
**Author:** autospec (codingsandmore/tidyboard)
**Status:** Approved (single-pass design, see Phase 1 audit below)

## Overview

This spec covers three concerns identified by the user:

1. **A. Event member assignment** — the create-event UI silently drops `assigned_members`; backend has no household-scoped validation.
2. **B. Meal-plan completion** — recipes + meal plans are ~80% built; finish the last 20% (entry edit form, delete, import polling, missing tests, shopping-multiplier verification).
3. **C. Error surfacing** — frontend collapses `ApiError{code,message,status}` to "Failed to save"; backend returns plain-text 500s on panic; no request IDs.

Phase 1 investigation findings are summarized below. Each child issue should reference the specific section heading in this doc as `Source spec`.

## A. Event member assignment

### A.1 Audit (what's there now)

| Layer       | File / Line                                                    | State                                                              |
| ----------- | -------------------------------------------------------------- | ------------------------------------------------------------------ |
| Schema      | `migrations/20260423000004_init_events.sql:33`                 | ✅ `assigned_members UUID[]` column exists                          |
| Query       | `internal/query/event.sql.go:61-142`                           | ✅ `CreateEvent` accepts `AssignedMembers []uuid.UUID`              |
| Model       | `internal/model/event.go:43`                                   | ✅ `CreateEventRequest.AssignedMembers` field exists                |
| Handler     | `internal/handler/event.go:64-87`                              | ⚠ Decodes payload; no validation                                   |
| Service     | `internal/service/event.go:141-175`                            | ⚠ Passes through with **zero validation** of household membership  |
| Web hook    | `web/src/lib/api/hooks.ts:670`                                 | ❌ `useCreateEvent` mutation type omits `assigned_members`          |
| Web UI      | `web/src/components/screens/calendar.tsx:996-1007`             | ❌ Mutation payload omits `assigned_members`                        |
| Web UI      | `web/src/components/screens/calendar.tsx:1194-1219`            | ❌ Hardcoded comment: `Members (display only — no assignment API on create yet)`; UI rendered at `opacity:0.5` |
| Test        | `internal/handler/event_test.go:89-242`                        | ⚠ Test missing `//go:build integration` tag, no assignee coverage  |

### A.2 Goal

Create-event POST and edit-event PATCH accept an `assigned_members` array of household member UUIDs. The handler validates each UUID belongs to the same household as the event. The web modal renders a chip multi-select of household members (active + visible roles), submits the IDs, and renders existing assignees on the edit screen.

### A.3 API contract

**POST `/v1/events`** (already exists, extend):
```jsonc
{
  "title": "string",
  "start_time": "ISO-8601",
  "end_time": "ISO-8601",
  "location": "string?",
  "description": "string?",
  "recurrence_rule": "RRULE?",
  "is_countdown": "bool?",
  "assigned_members": ["uuid", "uuid"]   // NEW; optional, default []
}
```

**PATCH `/v1/events/{id}`** mirrors the same field. Empty array = unassigned.

Validation rules in `internal/service/event.go`:

1. If `len(assigned_members) == 0`, allow (event is unassigned).
2. Otherwise, query members by IDs in a single round trip and assert all returned rows have `household_id == event.household_id`. Reject the request with `ErrInvalidMember` (HTTP 400) if any ID is missing or belongs to another household.
3. Deduplicate the slice before persisting.

### A.4 Web UI

`web/src/components/screens/calendar.tsx`:

- Replace the read-only members preview (lines 1194-1219) with a chip multi-select using existing household members from `useHouseholdMembers()` (or whatever the analogous hook is — confirm via grep).
- Wire `assigned_members` into the `useCreateEvent()` mutation payload (line 996-1007) and the edit equivalent.
- On the event detail/agenda view, render member avatars from `event.assigned_members` (already returned by the API).

`web/src/lib/api/hooks.ts:670`:

- Extend `CreateEventInput` and `UpdateEventInput` types to include `assigned_members?: string[]`.

### A.5 Tests

Required, real Postgres (no mocks):

- `internal/handler/event_test.go` — add `//go:build integration` tag; add `TestEvent_Create_WithAssignees_Success` covering happy path; add `TestEvent_Create_WithForeignHouseholdMember_Returns400` covering rejection.
- `web/src/components/screens/calendar.test.tsx` (or nearest analog) — render the form, select two members, submit, assert mutation payload includes `assigned_members: [id1, id2]`.

### A.6 Out of scope

- Per-assignee email/push notifications.
- "My events only" calendar filter toggle.
- Bulk reassignment.

---

## B. Meal-plan completion

### B.1 Audit (what's there now)

Backend (`internal/handler/{recipe,meal_plan}.go`, `internal/service/{recipe,meal_plan}.go`, schema in `sql/schema/`): full CRUD, recipe import (URL + Paprika), collections, drag-drop UI, copy-last-week, shopping-list generation. Routes registered (`cmd/server/main.go:380-400`). Web pages live at `/recipes`, `/recipes/[id]`, `/recipes/[id]/cook`, `/recipes/import`, `/meals`.

### B.2 Gaps to close

Each gap below becomes its own child issue.

**B.2.a Meal-plan entry edit form.** The `meal_plan_entries` table has `serving_multiplier`, `batch_quantity`, `planned_leftovers` columns and the upsert API supports them, but the web grid has no form to edit them. Add a popover/modal triggered when a user clicks an existing meal-plan cell, with three numeric fields and Save/Cancel. Wire to `useUpsertMealPlanEntry`. Real-data integration test.

**B.2.b Meal-plan entry delete.** The DELETE endpoint exists. Add a delete button (trash icon) inside the same popover from B.2.a. Wire to a `useDeleteMealPlanEntry` hook (create if missing). Test.

**B.2.c Recipe import-job polling UI.** `/v1/recipes/import` returns a job ID; jobs are persisted in `recipe_import_jobs`. Add a `GET /v1/recipes/import-jobs/{id}` endpoint if missing, then a `useImportJob(id)` hook that polls every 2s, and a status panel on the import page showing in-progress / success / error with the actual error message. Test.

**B.2.d Dedicated meal-plan tests.** Create `web/src/components/screens/meal-plan.test.tsx` (or nearest analog) covering: render grid, drag recipe to slot, edit multiplier, delete entry. Use the existing test helper conventions (look at `web/src/components/screens/calendar.test.tsx`).

**B.2.e Shopping-list multiplier integration.** `/v1/shopping/generate` accepts a date range and produces a shopping list. Verify that `serving_multiplier` and `batch_quantity` actually scale ingredient quantities. Write a Go integration test that creates a recipe with 2-cup flour @ 1x servings, plans it at multiplier 2.5x, generates a shopping list, asserts 5 cups of flour. Fix the service if it doesn't.

**B.2.f Recipe detail end-to-end render.** Verify `/recipes/[id]` actually displays ingredients (via `recipe_ingredients` rows) and steps (via `recipe_steps` rows) — not just the recipe header. If the page only fetches the parent recipe, extend it to fetch `GET /v1/recipes/{id}/ingredients` and `GET /v1/recipes/{id}/steps` (add endpoints if missing). Real-data integration test.

**B.2.g Pantry-sync verification.** Add a Go integration test that creates a `pantry_staples` row, generates a shopping list from a meal plan that uses that ingredient, and asserts the staple is excluded (or quantity-reduced — pick whichever the existing service does and lock it in). Do not add UI in this issue.

### B.3 Out of scope

- New cooking-mode features.
- Recipe sharing across households.
- Calorie/nutrition fields.
- A separate "favorites" page.

---

## C. Error surfacing

### C.1 Audit

| Layer    | File                                        | Issue                                                                      |
| -------- | ------------------------------------------- | -------------------------------------------------------------------------- |
| API ctx  | `internal/handler/respond/respond.go`       | Errors returned as JSON `{code, message}` but no status echo, no request ID |
| Panic    | `internal/middleware/`                      | No recovery middleware confirmed; Go default returns plain-text 500       |
| Web      | `web/src/lib/api/client.ts`                 | `ApiError` thrown with `{code, message, status}`; no `requestId`/`url`     |
| Web      | `web/src/app/error.tsx` / `global-error.tsx`| Renders generic "Something went wrong" + Next.js digest                    |
| Web      | mutation `onError` call sites               | Most show `"Failed to <verb>"` with no error detail                        |

### C.2 Goal

Every backend error response is JSON-shaped `{code, message, status, request_id}`. Every frontend error display includes status, code, message, request_id, and a copy-to-clipboard button for full JSON. Panics never escape as plain text.

### C.3 Backend changes

**C.3.a Request-ID middleware.** Add (or confirm + extend) `internal/middleware/request_id.go` that generates a UUID per request, stores it in the context under a typed key, and echoes it as `X-Request-ID` on the response. Mount before logging and recovery in `cmd/server/main.go`.

**C.3.b Panic-recovery middleware.** Add `internal/middleware/recover.go` with a `Recover()` middleware that wraps the handler; on panic, log the stack, write JSON `{code:"internal_error", message: "<panic message>", status: 500, request_id: <ctx>}`. Integration test: register a handler that panics, hit it via `httptest`, assert JSON body. Mount in `cmd/server/main.go` after request_id but before routes.

**C.3.c Error envelope.** Update `internal/handler/respond/respond.go` so that `respond.Error(w, r, status, code, msg)` emits `{code, message, status, request_id}` and includes the request ID pulled from context. All existing call sites continue to work; the new `request_id` field is added.

**C.3.d Debug header.** When request header `X-Debug: 1` is set AND `Config.DebugErrors == true` (env-driven, default false in prod), include the panic stack in the error response under a `stack` key. Off by default; one integration test for both branches.

### C.4 Web changes

**C.4.a Extend `ApiError`** in `web/src/lib/api/types.ts`:

```ts
export interface ApiError extends Error {
  code: string;
  message: string;
  status: number;
  requestId?: string;
  url: string;
  method: string;
  stack?: string;        // populated only when X-Debug: 1
}
```

**C.4.b Update `web/src/lib/api/client.ts`** so the catch path:
1. Reads `X-Request-ID` response header.
2. Attempts `res.json()`; if it throws (plain-text 500), constructs `{code: "non_json_response", message: res.statusText || "Server error", status: res.status}` synthetically.
3. Always populates `url` and `method`.

**C.4.c New `<ErrorAlert/>` component** at `web/src/components/ui/error-alert.tsx`:
- Props: `error: ApiError | unknown` (handle non-ApiError gracefully).
- Renders: status, code, message, request ID (small, mono), "Copy details" button that writes JSON of the error to the clipboard, optional `<details>` for stack when present.
- Storybook story + snapshot test.

**C.4.d Rewrite `web/src/app/error.tsx` and `global-error.tsx`** to render `<ErrorAlert error={error}/>` plus a "Try again" button that calls the `reset()` prop. Keep design language consistent with existing pages.

**C.4.e Migrate three high-value `onError` call sites** to use `<ErrorAlert/>` (or a toast variant that surfaces the same fields):
1. Create event mutation in `web/src/components/screens/calendar.tsx`.
2. Upsert meal-plan entry in `web/src/components/screens/recipes.tsx` (or wherever the meal-plan handler lives).
3. Recipe import in `web/src/app/recipes/import/page.tsx`.

A future cleanup pass can migrate the remaining call sites; out of scope here.

### C.5 Out of scope

- Sentry / external error tracking.
- Per-route error boundaries.
- Internationalization of error messages.

---

## Cross-cutting conventions

All work in this spec follows the project's existing conventions:

- **TDD non-negotiable.** Failing test first, implement, refactor, commit.
- **Real services in tests.** No DB mocks. Postgres via the existing test harness.
- **Conventional commits.** `feat:`/`fix:`/`test:`/`docs:`/`refactor:`.
- **No force-push, no `--no-verify`.**
- **Branch per issue.** Naming: `feat/event-assignees`, `feat/meal-plan-edit-form`, `fix/error-envelope`, etc.
- **Auto-merge** on green CI + LGTM self-review (per `AGENTS.md`).
- **Member.role enum** is `"adult" | "child"`, never `"kid"` (project memory).
- **CI on `main`** is chronically red except `Deploy to EC2`. Required checks for auto-merge are the ones that gate the deploy job; pre-existing failing checks (Web build, Go integration, Python, CodeQL, Chromatic) do not block.
- **Push to `main`** triggers `.github/workflows/deploy-ec2.yml` to EC2 (`98.91.94.149`). Every merged child PR ships to prod.

## Implementation order (dependency edges)

```
A.1 Backend validation (handler+service+test)
  ↓
A.2 Web UI multi-select + payload wiring + test

B.2.a Meal-plan edit form
B.2.b Meal-plan delete (depends on B.2.a — shares popover)
B.2.c Import-job polling (independent)
B.2.d Meal-plan tests (depends on B.2.a + B.2.b — needs the UI to exist)
B.2.e Shopping multiplier integration test (independent)
B.2.f Recipe detail render verify (independent)
B.2.g Pantry sync test (depends on B.2.e — shares fixtures, do after)

C.3.a Request-ID middleware (foundation)
C.3.b Panic-recovery middleware (depends on C.3.a)
C.3.c Error envelope (depends on C.3.a)
C.3.d Debug header (depends on C.3.b + C.3.c)
  ↓
C.4.a-c ApiError + client + ErrorAlert (depends on C.3.c — needs request_id field)
C.4.d error.tsx rewrite (depends on C.4.a-c)
C.4.e Migrate three call sites (depends on C.4.a-c)
```

## Test gates

A child issue is "done" when:

1. `go build ./... && go vet ./...` is green from the worktree root.
2. `go test ./... -count=1 -tags=integration` covers the new code (the issue body specifies the exact `-run` filter).
3. `cd web && npm run lint && npm run typecheck` are green (or no worse than before).
4. `cd web && npm test -- <relevant_pattern>` is green for the new test file.
5. The PR's Primary smoke test (defined per issue) passes when run from the issue's worktree.
6. The self-review subagent returns `LGTM`.
7. Required CI checks pass on the PR.

When all 7 are true, the autospec monitor admin-merges per AGENTS.md.

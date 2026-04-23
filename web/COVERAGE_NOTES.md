# Coverage Notes

## Test run summary

- **Test files:** 27
- **Tests:** 352 passed, 0 failed
- **Tool:** Vitest 4.1.5 + @vitest/coverage-v8

## Overall coverage

| Metric     | Coverage |
|------------|----------|
| Statements | 90.85%   |
| Branches   | 93.9%    |
| Functions  | 84.16%   |
| Lines      | 91.66%   |

## Coverage by directory

Directories not shown in the v8 text table were at 100% (v8 omits them).

| Directory                    | Stmts  | Branches | Funcs  | Lines  | Notes |
|------------------------------|--------|----------|--------|--------|-------|
| `src/lib`                    | 100%   | 100%     | 100%   | 100%   | All 3 lib files fully covered |
| `src/components/screens`     | 98.72% | 98.69%   | 89.3%  | 98.65% | Exceeds 90% target |
| `src/components/ui`          | 86.2%  | 93.75%   | 87.5%  | 86.2%  | input.tsx focus/blur handlers uncovered |
| `src/components/frames`      | 100%   | 100%     | 100%   | 100%   | PhoneFrame, TabletFrame, LaptopFrame |
| `src/components/scene`       | 100%   | 100%     | 100%   | 100%   | Scene component |
| `src/components/adaptive-dashboard` | 100% | 100%  | 100%   | 100%   | AdaptiveDashboard |
| `src/app` (route pages)      | ~55%   | ~65%     | ~40%   | ~60%   | Smoke-only; many pages are thin wrappers |

## Per-file gaps

### `src/components/ui/input.tsx` (42.85% stmts)
The `onFocus` and `onBlur` handlers (lines 63–68) are not executed by testing-library in jsdom because
`fireEvent.focus/blur` does not trigger the direct `e.target.style` mutations the component uses.
These are purely visual style changes (border color, box shadow) with no functional impact.
**Decision:** Skip — testing inline style side-effects of focus/blur requires brittle workarounds.

### `src/components/ui/heading.tsx` (branches 66.66%)
Lines 14 and 23 contain ternary branches for `typeof spec.letter` — one branch (`undefined`) is not
hit by tests. It is dead code given the current `TYPE` data always provides a letter value or omits it.
**Decision:** Acceptable gap — the branch is defensive code, not reachable with real data.

### `src/components/screens/calendar.tsx` (line 28 — ViewTabs `onChange` not tested for all tabs)
The `onChange` callback on `ViewTabs` is wired to `() => {}` in all callers except `CalAgenda`.
Line 28 is the `onChange(v)` call inside `ViewTabs`. Not easily exercised without a stateful wrapper.
**Decision:** Acceptable — smoke tests confirm render; the component is presentational.

### `src/components/screens/dashboard-kiosk.tsx` (line 334 — `tabHref` default branch)
The `default:` branch of `tabHref()` returns `undefined` for unknown labels. Never reached with
the real `KIOSK_TABS` data.

### `src/components/screens/onboarding.tsx` (lines 208, 402)
Line 208: the "show password" toggle in `ObCreate` is tested for presence but the actual toggle
click on the inner anonymous button is not captured by the test (the button has no accessible label).
Line 402: color-picker click handler in `ObSelf`.
**Decision:** State interactions noted; render smoke passes.

### `src/app` route pages

| File | Stmts | Why partial |
|------|-------|-------------|
| `app/page.tsx` (root) | ~100% | Fully covered via AdaptiveDashboard test |
| `app/calendar/page.tsx` | 50% | Has a client-side `CalendarView` component using `useState` for tab — not tested with interaction |
| `app/lock/page.tsx` | 57% | PIN entry interaction not simulated |
| `app/onboarding/page.tsx` | 58% | `router.push` and step navigation not exercised |
| `app/onboarding/[step]/page.tsx` | 57% | `notFound()` path not exercised |
| `app/recipes/[id]/page.tsx` | 50% | Both found and not-found paths tested; `notFound()` mock only covers branch |

## Files skipped entirely

| File | Reason |
|------|--------|
| `src/app/layout.tsx` | Explicitly excluded per spec — hard to test (root layout with fonts/CSS) |
| `src/app/error.tsx` | Next.js error boundary — requires error simulation beyond jsdom scope |
| `src/app/loading.tsx` | Next.js loading UI — render-only, no logic; skipped for brevity |
| `src/app/not-found.tsx` | One-line render; not worth a dedicated test |
| `src/app/robots.ts` | Returns static config object — no component to render |
| `src/app/sitemap.ts` | Returns static URL list — no component to render |

## Known fragile tests

- **`ShoppingList` toggle test**: relies on walking up the DOM with `.closest("div[style*='cursor: pointer']")` —
  will break if the wrapper element's style changes.
- **`RoutineKid` toggle test**: same pattern — finds the clickable wrapper by style attribute.
- **App pages dynamic param test**: passes a raw `Promise.resolve({...})` as `params` — works because
  Next.js 16 made params a Promise; if the API changes this will need updating.

## Constraints met

- No existing source files modified
- No Jest config created (Vitest only)
- No E2E / Playwright tests
- `npm test` exits 0 with all 352 tests green
- `npm run coverage` produces text + HTML + json-summary reports

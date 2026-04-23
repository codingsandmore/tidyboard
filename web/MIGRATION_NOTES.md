# API Migration Notes

## Wave 2 — COMPLETE (all screens migrated)

All remaining screens have been migrated from direct `TBD` sample data imports
to React Query hooks. Fallback to TBD sample data is automatic when
`NEXT_PUBLIC_API_URL` is empty or the backend is unreachable.

---

## Wave 1 — Migrated Screens

The following 5 screens were migrated in Wave 1:

| Screen | Hook(s) used | Mutations | File(s) changed |
|--------|-------------|-----------|-----------------|
| Calendar Agenda | `useEvents({ start, end })` | — | `src/components/screens/calendar.tsx`, `src/app/calendar/page.tsx` |
| Shopping List | `useShopping()` | `useToggleShoppingItem` | `src/components/screens/recipes.tsx`, `src/app/shopping/page.tsx` |
| List Detail | `useList(id)` | `useToggleListItem` (via component) | `src/app/lists/[id]/page.tsx` |
| Routine Kid | `useRoutines()` | `useToggleRoutineStep` | `src/components/screens/routine.tsx`, `src/app/routines/page.tsx` |
| Equity Dashboard | `useEquity(period)` | — | `src/components/screens/equity.tsx` |

---

## Wave 2 — Migrated Screens

The following screens were migrated in Wave 2:

| Screen | Hook(s) used | Mutations | File(s) changed |
|--------|-------------|-----------|-----------------|
| `CalDay` | `useMembers()`, `useEvents()` | — | `src/components/screens/calendar.tsx` |
| `CalWeek` | none (week derived client-side from TBD.week) | — | unchanged — no hook for week grid |
| `CalMonth` | none (hardcoded dot map) | — | unchanged — visual only |
| `EventModal` | `useMembers()` | — | `src/components/screens/calendar.tsx` |
| `DashKiosk` | `useMembers()`, `useEvents()` | — | `src/components/screens/dashboard-kiosk.tsx` |
| `DashPhone` | `useMembers()`, `useEvents()` | — | `src/components/screens/dashboard-phone.tsx` |
| `DashDesktop` | `useMembers()`, `useEvents()` | — | `src/components/screens/dashboard-desktop.tsx` |
| `DashKioskColumns` | `useMembers()`, `useEvents()` | — | `src/components/screens/dashboard-kiosk-columns.tsx` |
| `DashKioskAmbient` | `useMembers()`, `useEvents()` | — | `src/components/screens/dashboard-kiosk-ambient.tsx` |
| `RecipeDetail` | `useRecipe(id)` | — | `src/components/screens/recipes.tsx` |
| `RecipeImport` | — | `useImportRecipe` (POST /v1/recipes/import) | `src/components/screens/recipes.tsx` |
| `MealPlan` | `useMealPlan()`, `useRecipes()` | — | `src/components/screens/recipes.tsx` |
| `Race` | `useRace()` | — | `src/components/screens/equity.tsx` |

### New hooks added

In `src/lib/api/hooks.ts`:
- `useMealPlan(weekOf?)` — GET `/v1/meals?weekOf=…`, fallback to `TBD.mealPlan`
- `useRace()` — GET `/v1/races/current`, fallback to `TBD.race`
- `useImportRecipe()` — POST `/v1/recipes/import`, invalidates recipe list on success

In `src/lib/api/fallback.ts`:
- `fallback.mealPlan()` — returns `TBD.mealPlan`
- `fallback.race()` — returns `TBD.race`

### Migration details

**CalDay / EventModal** (`src/components/screens/calendar.tsx`)
- Uses `useMembers()` for member list (falls back to `TBD.members`).
- `CalDay` also uses `useEvents()` to populate per-member event columns.
- `CalWeek` and `CalMonth` remain on TBD: week grid data has no API endpoint yet; month view uses a hardcoded dot map.

**DashKiosk / DashPhone / DashDesktop / DashKioskColumns / DashKioskAmbient**
- Each uses `useMembers()` + `useEvents()` with TBD fallback.
- Added `"use client"` to files that were missing it (dashboard-phone, dashboard-desktop, dashboard-kiosk-columns, dashboard-kiosk-ambient).

**RecipeDetail** (`src/components/screens/recipes.tsx`)
- Uses `useRecipe(id)` where `id` defaults to the first TBD recipe id when no prop provided.
- Falls back to `TBD.recipes[0]` when hook returns undefined.

**RecipeImport** (`src/components/screens/recipes.tsx`)
- URL field is now controlled state (was hardcoded string).
- Import button calls `useImportRecipe().mutate(url)` on click.

**MealPlan** (`src/components/screens/recipes.tsx`)
- Uses `useMealPlan()` (falls back to `TBD.mealPlan`).
- Uses `useRecipes()` for the recipe lookup in the grid (falls back to `TBD.recipes`).

**Race** (`src/components/screens/equity.tsx`)
- Uses `useRace()` (falls back to `TBD.race`).

---

## Screens intentionally keeping direct TBD imports (preview routes only)

Preview routes import components for design review — they are explicitly excluded
from migration per project rules.

| Route | Reason |
|-------|--------|
| `src/app/*/preview*` routes | Design-review pages — intentionally direct, not production screens |

Note: The underlying screen components used by preview routes (e.g. `RecipeDetail`,
`RecipeImport`, `Race`) have been migrated; preview pages merely wrap them. The
test wrappers for those preview pages use `smokeWithQuery()` accordingly.

---

## Test changes

All tests for migrated components now wrap renders in `QueryClientProvider` via a
`renderWithQuery()` helper. Updated test files:

- `src/components/screens/calendar.test.tsx` — `CalDay`, `EventModal` + existing `CalAgenda`
- `src/components/screens/dashboard-kiosk.test.tsx`
- `src/components/screens/dashboard-phone.test.tsx`
- `src/components/screens/dashboard-desktop.test.tsx`
- `src/components/screens/dashboard-kiosk-columns.test.tsx`
- `src/components/screens/dashboard-kiosk-ambient.test.tsx`
- `src/components/screens/recipes.test.tsx` — `RecipeImport`, `RecipeDetail`, `MealPlan`
- `src/components/screens/equity.test.tsx` — `Race`
- `src/components/adaptive-dashboard.test.tsx`
- `src/app/app-pages.test.tsx` — all dashboard, calendar/day, meals, recipe, race pages

**Final status:** 437 tests pass, 0 failed. Build passes. Coverage ≥ 89%.

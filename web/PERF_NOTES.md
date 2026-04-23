# Performance Optimization Notes

## What was measured

### Hot-spot 1 — Button hover re-renders (HIGH IMPACT)
`src/components/ui/button.tsx` used `useState(false)` + `onMouseEnter`/`onMouseLeave`
to toggle hover background. Every mouse movement over any button caused a React
state update → reconciliation → re-render of the button subtree. The app has
`Btn` components on nearly every screen (EventModal, RecipeDetail, ShoppingList
header, Settings, Onboarding steps, MealPlan header, etc.), making this the
highest-frequency source of unnecessary renders.

### Hot-spot 2 — "use client" audit
Grepped all files with `"use client"` in `src/app/` and `src/components/screens/`.

- `src/app/recipes/page.tsx` — marked `"use client"` but has **no hooks at all**.
  Only uses `Link`, data imports, and renders JSX. Removing the directive lets
  Next.js prerender it as a true Server Component.
- `src/app/routines/page.tsx` — same: no hooks, only renders `RoutineKid` (a
  client component, which is fine to import from a server component). Removed.
- All other `"use client"` files legitimately need it: `useState` for tab
  switching (calendar, equity pages), router navigation (lock, onboarding), or
  interactive state in the component itself (DashKiosk, RoutineKid, ShoppingList,
  RecipeDetail, onboarding steps).

### Hot-spot 3 — Adaptive dashboard triple-mount
`adaptive-dashboard.tsx` mounts all three dashboard variants (phone/kiosk/desktop)
and hides two via CSS `display:none`. This is intentional and correct — the
alternative (JS-based viewport detection) causes SSR/hydration mismatch flash.
No change made; the comment in the source explains the tradeoff.

### Hot-spot 4 — `.map()` / React.memo audit
Inspected `DashKiosk`, `CalDay`, `MealPlan`, `ShoppingList`, `Equity`, `Race`.
Largest lists: `eq.domainList` (~12 items), `r.items` in Race (~10 items),
shopping categories × items (small). None exceed 20 items. No `React.memo`
wrapping needed.

### Hot-spot 5 — Font display:swap
`src/app/layout.tsx` (off-limits per spec) loads Fraunces, Inter, JetBrainsMono
without explicit `display: 'swap'`. Next.js `next/font/google` defaults to
`display: 'optional'` when no `display` option is set. Not modified (spec
restricts layout.tsx), but noted: adding `display: 'swap'` to each font call
would be a free FOUT-avoidance win.

### Hot-spot 6 — tsconfig / test file type-checking
`vitest.config.ts` and `src/test/setup.ts` (plus `*.test.{ts,tsx}` files) were
included in the TypeScript compilation via the wide `**/*.ts` glob in tsconfig.
They reference vitest globals (`vi`) not in the tsconfig type set, causing build
failures. Added these to `tsconfig.json` `exclude`. This was a pre-existing
blocker preventing any clean build.

---

## What was changed

| File | Change | Why |
|---|---|---|
| `src/components/ui/button.tsx` | Removed `useState`/`onMouseEnter`/`onMouseLeave`; replaced with CSS custom property `--tb-btn-hover` + `className="tb-btn"` | Eliminates a React re-render on every hover event across all buttons |
| `src/app/globals.css` | Added `.tb-btn:not(:disabled):hover { background: var(--tb-btn-hover) !important; }` | Native CSS hover, zero JS involvement |
| `src/app/recipes/page.tsx` | Removed `"use client"` directive | No hooks used; page can be server-rendered |
| `src/app/routines/page.tsx` | Removed `"use client"` directive | No hooks used; page can be server-rendered |
| `tsconfig.json` | Added `vitest.config.ts`, `src/test`, `**/*.test.ts`, `**/*.test.tsx`, `**/*.spec.ts`, `**/*.spec.tsx` to `exclude` | Pre-existing blocker: vitest setup files use globals not typed in tsconfig |

---

## Expected performance delta

- **Button hover**: Eliminates O(n_buttons × hover_frequency) React re-renders.
  On a dense screen like the kiosk dashboard or event modal, this was triggering
  renders on every mouse movement. With CSS hover the browser handles it entirely
  in the compositor thread — no JS execution, no React diffing, no layout.
  **Estimated impact: significant reduction in CPU usage during normal mouse
  interaction, especially on low-power devices like a Raspberry Pi.**

- **Server component promotion** (recipes, routines pages): Reduces JS bundle
  shipped to the client for those two routes and eliminates client-side
  hydration overhead for the page shell (the interactive child components still
  hydrate, but the outer shell is static HTML).
  **Estimated impact: minor — fewer bytes, faster TTI on those pages.**

- **Build correctness**: The tsconfig fix allows `npm run build` to complete
  without errors. Without it the app could not be deployed at all.

---

## What was NOT changed (and why)

- `adaptive-dashboard.tsx` — triple-mount is a deliberate SSR-safety tradeoff.
  CSS-only approach avoids hydration mismatch. No change.
- `src/app/layout.tsx` — off-limits per spec. Font `display` option should be
  reviewed by the specs-audit agent.
- `src/lib/data.ts`, `src/lib/tokens.ts`, `package.json` — off-limits per spec.
- Bundle analyzer — not added; build output already shows static prerendering
  for 52 routes as expected, with 1 dynamic route (`/recipes/[id]`).

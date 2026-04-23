# Accessibility Notes — Focus Visibility (WCAG 2.4.7)

## What Was Added

### `src/app/globals.css`

Two CSS rule blocks were appended to address the WCAG 2.4.7 failure (no `:focus-visible` rings on interactive elements):

1. **Mouse-click reset** — `:focus:not(:focus-visible) { outline: none }` suppresses the default browser focus ring for mouse/pointer users who don't need it.

2. **Keyboard focus ring** — A `:focus-visible` rule targeting:
   - `a`, `button`, `input`, `select`, `textarea`
   - `[role="button"]`
   - `[tabindex]`

   Ring spec: `2px solid var(--tb-primary)` (`#4F7942`), `outline-offset: 2px`, `border-radius: 8px` for smooth corners.

## What Was Audited and Found Clean

### `src/components/ui/button.tsx`
The `Btn` component's inline `style` object does not set `outline`, `outline-width`, or `outline: none` at any point. The global `:focus-visible` ring applies unobstructed. No changes required.

### `src/components/screens/**` and `src/app/**/page.tsx`
A full grep for `outline.*none` and `outline.*0` across these directories returned zero matches. No inline style suppresses focus rings in any screen or page component.

## Kid-Mode Touch Target Check

`src/components/screens/routine.tsx` — `RoutineKid` step cards are rendered with `minHeight: 64` (line 72), which meets and exceeds the 56px minimum specified in the design brief. No concerns.

## Remaining A11y Concerns

None introduced by these changes. The focus ring implementation is additive and does not alter any existing styles or layout. Further WCAG audits (color contrast ratio for the `#4F7942` ring on various backgrounds, skip-navigation link, ARIA landmark coverage) are out of scope for this task but recommended as follow-on work.

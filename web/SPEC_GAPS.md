# Tidyboard — Spec Gaps Audit

**Date:** 2026-04-22  
**Auditor:** Executor agent  
**Scope:** `specs/tidyboard-spec.md` (§1, §2, §6, §9, §14), `tidyboard-claude-design-brief.md`, `tidyboard-design-system.md` vs `web/src/`

---

## 1. v0.1 MVP Scope Check (§14)

> Key: ✅ implemented (UI exists) / ⚠ partial / ❌ missing / ℹ backend/infra — out of UI scope

| MVP Requirement | Status | Notes / Location |
|---|---|---|
| Docker Compose self-hosted deployment | ℹ | Backend infra, not UI |
| Lambda + API Gateway (CDK) | ℹ | Backend infra |
| Single Go codebase compiling to binary + Lambda | ℹ | Backend |
| PostgreSQL schema + goose migrations | ℹ | Backend |
| sqlc-generated query layer | ℹ | Backend |
| Account registration (email + password) | ⚠ | Onboarding screen 2 has a create-account form UI (`src/components/screens/onboarding.tsx`) but no real auth endpoint wiring |
| Household creation + member management | ⚠ | Onboarding screen 3–5 has household/member UI; no backend wiring |
| Add children without email (accountless, PIN) | ⚠ | Onboarding step 5 has PIN setup UI; not wired |
| Email-based invitations for adults | ❌ | No UI or backend for invite flow |
| Invite code flow with owner approval | ❌ | Not in any route |
| Local calendar with event CRUD | ⚠ | `src/app/calendar/page.tsx` has 4 views + event modal; modal is static, no real CRUD |
| Google Calendar two-way sync | ❌ | Onboarding step 6 has "Connect Google Calendar" button (static); no OAuth flow |
| iCal URL one-way import | ❌ | Mentioned in onboarding step 6 as text link; not wired |
| Daily / weekly / monthly calendar views | ✅ | `src/components/screens/calendar.tsx` — CalDay, CalWeek, CalMonth, CalAgenda |
| Full-text search across events | ❌ | Agenda view has a search bar UI (`CalAgenda`) but it is non-functional |
| Scheduling conflict detection | ❌ | No conflict warning in event modal |
| Basic to-do lists (shared + personal) | ❌ | No `/lists` route or lists screen |
| Basic star rewards for task completion | ⚠ | Star counter UI visible in routine/kiosk screens; no backend |
| Completion animations | ⚠ | CSS animation on routine steps; no canvas-confetti integration |
| Tablet kiosk mode with per-member PIN auth | ⚠ | `src/app/lock/page.tsx` + KioskLock/KioskLockMembers screens; PIN entry is static |
| Phone-optimized responsive layout | ✅ | `AdaptiveDashboard` + CSS media queries in `globals.css` |
| Desktop browser layout | ✅ | `dashboard-desktop.tsx` screen |
| PWA install support | ⚠ | **No `manifest.webmanifest`** (fixed in Part B); no service worker |
| WebSocket realtime updates | ❌ | No WebSocket client code anywhere |
| Photo wallpaper / sleep mode | ⚠ | Lock screen shows photo-style background (static); no actual photo slideshow |
| Dark mode with auto-switching | ⚠ | Dark variants exist (`calendar/day-dark`, `routines/kid-dark`, etc.) but no user-facing dark mode toggle or `prefers-color-scheme` switching; dark variants are separate static preview routes |
| Audit log (all mutations logged) | ℹ | Backend concern |
| Household data export (ZIP) | ℹ | Backend concern; no UI button for export in settings screen |
| Automated nightly backups | ℹ | Backend concern |
| Maintenance mode | ℹ | Backend concern |
| Offline resilience (cached data + mutation queue) | ❌ | No service worker; no local state queue; no offline handling UI |
| Accessibility: WCAG 2.1 AA, prefers-reduced-motion | ⚠ | See §4 for details; gaps exist |
| i18n framework (English + German) | ❌ | No i18n library (`next-intl`, `react-i18next`, etc.) installed; all text is hardcoded English |
| Stripe integration (cloud billing) | ℹ | Backend concern; `src/components/ui/stripe-placeholder.tsx` exists as UI placeholder |

---

## 2. Design System Token Check

Comparing `src/lib/tokens.ts` (`TB` object) against `specs/tidyboard-design-system.md` §3.

### 2.1 Colors — Match / Mismatch

| Token | Spec Value | `tokens.ts` Value | Status |
|---|---|---|---|
| brand.primary | `#4F7942` | `TB.primary = "#4F7942"` | ✅ |
| brand.primary-hover | `#3D6233` | `TB.primaryHover = "#3D6233"` | ✅ |
| brand.primary-foreground | `#FFFFFF` | `TB.primaryFg = "#FFFFFF"` | ✅ |
| brand.secondary | `#D4A574` | `TB.secondary = "#D4A574"` | ✅ |
| brand.accent | `#7FB5B0` | `TB.accent = "#7FB5B0"` | ✅ |
| brand.destructive | `#DC2626` | `TB.destructive = "#DC2626"` | ✅ |
| brand.warning | `#F59E0B` | `TB.warning = "#F59E0B"` | ✅ |
| brand.success | `#16A34A` | `TB.success = "#16A34A"` | ✅ |
| bg.primary (light) | `#FAFAF9` | `TB.bg = "#FAFAF9"` | ✅ |
| bg.secondary (light) | `#F5F5F4` | `TB.bg2 = "#F5F5F4"` | ✅ |
| bg.surface (light) | `#FFFFFF` | `TB.surface = "#FFFFFF"` | ✅ |
| bg.elevated (light) | `#FFFFFF` | `TB.elevated = "#FFFFFF"` | ✅ |
| bg.primary (dark) | `#1C1917` | `TB.dBg = "#1C1917"` | ✅ |
| bg.secondary (dark) | `#292524` | `TB.dBg2 = "#292524"` | ✅ |
| text.primary (light) | `#1C1917` | `TB.text = "#1C1917"` | ✅ |
| text.secondary (light) | `#78716C` | `TB.text2 = "#78716C"` | ✅ |
| text.muted (light) | `#A8A29E` | `TB.muted = "#A8A29E"` | ✅ |
| text.primary (dark) | `#FAFAF9` | `TB.dText = "#FAFAF9"` | ✅ |
| text.secondary (dark) | `#A8A29E` | `TB.dText2 = "#A8A29E"` | ✅ |
| text.muted (dark) | `#78716C` | `TB.dMuted = "#78716C"` | ✅ |
| member colors (12) | `[#3B82F6…]` | `TB.memberColors` (12 items) | ✅ |

### 2.2 Typography — Mismatch

| Token | Spec | `tokens.ts` | Status |
|---|---|---|---|
| display font | `"Cal Sans, system-ui, sans-serif"` | `'"Fraunces", "Cal Sans", Georgia, serif'` | ⚠ **Fraunces substituted for Cal Sans** — Fraunces is a variable serif (optical illusions/frivolous mode), very different aesthetic from Cal Sans. The AGENTS.md says this was intentional in implementation (Fraunces loaded via `next/font/google`), but the spec calls for Cal Sans. Noted for design sign-off. |
| body font | `"Inter, system-ui, sans-serif"` | `'"Inter", system-ui, -apple-system, sans-serif'` | ✅ (extended fallback OK) |
| mono font | `"JetBrains Mono, monospace"` | `'"JetBrains Mono", ui-monospace, "SF Mono", Menlo, monospace'` | ✅ |
| kiosk-glanceable size | `3rem (48px)` | `TYPE.kiosk = { size: 48 }` | ✅ |
| kiosk-heading size | `2rem (32px)` | Not explicitly in TYPE (no `kioskHeading` key — nearest is `h1=36`, `h2=30`) | ⚠ Minor gap |
| heading 1 | `2.25rem (36px)` | `TYPE.h1 = { size: 36 }` | ✅ |
| heading 2 | `1.875rem (30px)` | `TYPE.h2 = { size: 30 }` | ✅ |
| heading 3 | `1.5rem (24px)` | `TYPE.h3 = { size: 24 }` | ✅ |
| body | `1rem (16px)` | `TYPE.body = { size: 16 }` | ✅ |
| small | `0.875rem (14px)` | `TYPE.small = { size: 14 }` | ✅ |

### 2.3 Spacing & Radii — Check

| Token | Spec | `tokens.ts` | Status |
|---|---|---|---|
| radius.sm | `0.375rem (6px)` | `TB.r.sm = 6` | ✅ |
| radius.md | `0.5rem (8px)` | `TB.r.md = 8` | ✅ |
| radius.lg | `0.75rem (12px)` | `TB.r.lg = 12` | ✅ |
| radius.xl | `1rem (16px)` | `TB.r.xl = 16` | ✅ |
| radius.full | `9999px` | `TB.r.full = 9999` | ✅ |
| shadow.md | `0 4px 6px rgba(0,0,0,0.07)` | `TB.shadow = "0 4px 6px rgba(0,0,0,0.07)"` | ✅ |
| shadow.lg | `0 10px 15px rgba(0,0,0,0.1)` | `TB.shadowLg = "0 10px 30px rgba(0,0,0,0.10), …"` | ⚠ spec says 15px, implementation uses 30px — slightly more diffuse |
| shadow.sm | `0 1px 2px rgba(0,0,0,0.05)` | **Not in `tokens.ts`** | ⚠ Missing token |
| shadow.glow | `0 0 20px rgba(79,121,66,0.3)` | **Not in `tokens.ts`** | ⚠ Missing token |
| spacing scale | 0–16 in spec | Not exported as named tokens — used inline | ⚠ No `TB.spacing` object; spacing is ad-hoc inline in components |

---

## 3. Design Brief Screen Check (§2 of design brief)

| Screen Spec | Route / Component | Status |
|---|---|---|
| 2.1 Onboarding Wizard (7 screens) | `src/app/onboarding/page.tsx` + `src/components/screens/onboarding.tsx` | ✅ All 7 steps rendered |
| 2.2 Dashboard — Kiosk Tablet | `src/app/dashboard/kiosk/page.tsx` + `dashboard-kiosk.tsx` | ✅ |
| 2.3 Dashboard — Phone Layout | `src/app/dashboard/phone/page.tsx` + `dashboard-phone.tsx` | ✅ |
| 2.4 Dashboard — Desktop Layout | `src/app/dashboard/desktop/page.tsx` + `dashboard-desktop.tsx` | ✅ |
| 2.5 Calendar Views (4 screens) | `src/components/screens/calendar.tsx` (CalDay/CalWeek/CalMonth/CalAgenda) | ✅ |
| 2.6 Event Detail / Create Modal | `EventModal` in `calendar.tsx` | ✅ (static, no CRUD) |
| 2.7 Routine View (Kid-Facing) | `src/app/routines/page.tsx` + `RoutineKid` in `routine.tsx` | ✅ |
| 2.8 Recipe Import Flow | `src/app/recipes/import/page.tsx` + `RecipeImport` | ✅ |
| 2.9 Recipe Detail View | `src/app/recipes/[id]/page.tsx` + `RecipeDetail` | ✅ |
| 2.10 Meal Plan Weekly Grid | `src/app/meals/page.tsx` + `MealPlan` | ✅ |
| 2.11 Shopping List | `src/app/shopping/page.tsx` + `ShoppingList` | ✅ |
| 2.12 Equity Dashboard (Adults) | `src/app/equity/page.tsx` + `Equity` | ✅ |
| 2.13 Gamification — Race View | `src/app/race/page.tsx` + `Race` | ✅ |
| 2.14 Kiosk Lock Screen / Wallpaper | `src/app/lock/page.tsx` + `KioskLock`/`KioskLockMembers` | ✅ |
| 2.15 Settings Screen | `src/app/settings/page.tsx` + `Settings` | ✅ |
| 2.16 Dark Mode Variants | `calendar/day-dark`, `routines/kid-dark`, `equity/preview-dark`, `recipes/preview-detail-dark`, `dashboard/kiosk-dark` | ✅ as static preview routes |
| **Missing: Lists / To-Dos screen** | No `/lists` route | ❌ Spec §6.3 + MVP requirements include to-do lists; no screen designed or implemented |
| **Missing: Celebration animation components** | No confetti/Lottie integration | ❌ Brief §4.2 specifies Checkmark Burst, Confetti Cannon, Emoji Rain, Trophy, Badge Unlock, Reward Unlock, Streak Fire, Star Float — none wired |
| **Missing: Cooking Mode** | Brief §2.9 mentions "Start Cooking" full-screen mode | ❌ Not implemented |

---

## 4. Accessibility Gaps

Comparing `tidyboard-design-system.md` §7 requirements against `src/components/ui/`.

| Requirement | Status | Evidence |
|---|---|---|
| **44px touch targets (adults)** | ⚠ | `Btn` component: `sm=32px`, `md=40px` height. Only `lg=48px` and `xl=56px` meet the 44px minimum. Many nav elements in route pages use inline `padding: "6px 10px"` with `fontSize: 13` — these are well under 44px. |
| **56px touch targets (kid mode)** | ⚠ | `Btn xl=56px` meets this. Routine step cards in `routine.tsx` are designed large. However, the constraint is not enforced systematically — no `[data-kid-mode]` CSS rule or component prop. |
| **Visible focus rings** | ❌ | `globals.css` has NO `focus-visible` or `:focus` CSS for `.tb-btn`. `button.tsx` inline styles have no `outline` or `boxShadow` for focus state. The WCAG requirement is a 2px offset ring in brand primary — currently absent. All keyboard users see browser default (often suppressed by `outline: none` in CSS resets). |
| **WCAG AA contrast on member colors** | ⚠ | Design system claims all 12 member colors pass WCAG AA on both light and dark backgrounds. However `#F59E0B` (yellow, member color 4) has a contrast ratio of ~2.5:1 against `#FFFFFF` — below the 3:1 threshold for large text, 4.5:1 for body text. This is a known hard problem with yellow. Worth flagging for audit with actual contrast checker. |
| **No color-only information** | ⚠ | Member events in `CalDay` are color-coded with no secondary label/icon indicator in the cell background (color is the sole differentiator at a glance). Member name text is present but small. |
| **Screen reader landmarks** | ⚠ | Route pages use `<div>` wrappers throughout; no `<main>`, `<header>`, `<nav>`, `<aside>` semantic HTML. `AdaptiveDashboard` wraps in a div with `overflow:hidden`. |
| **`prefers-reduced-motion`** | ❌ | No `@media (prefers-reduced-motion: reduce)` CSS in `globals.css`. Inline CSS transitions (e.g. `transition: "all .2s"` in avatar, `transition: "background .12s, transform .06s"` in button) are not gated. |
| **Keyboard navigation** | ⚠ | Radix UI not used — components use native `<button>` elements (good), but modal overlays and the kiosk member picker have no focus trap. |
| **`aria-label` on icon-only buttons** | ⚠ | Some buttons have `aria-label` (e.g. the close button in `calendar/page.tsx`), but many icon-only controls in screens lack it. |

---

## 5. Non-UI Features (Backend Awareness — ℹ)

These are out of UI scope but noted for completeness:

| Feature | Notes |
|---|---|
| **JWT authentication** | Not wired — frontend has no auth token management, no `Authorization` header logic, no session storage |
| **CalDAV sync** | Python sync-worker service — no frontend polling/status UI |
| **Recipe scraper** | Python recipe-scraper service — import flow is static mock; no real HTTP call to backend |
| **Household scoping** | All data is mock (`src/lib/data.ts` `TBD` object); no `household_id` filtering |
| **WebSocket realtime** | No WS client; no reconnection logic; no optimistic UI |
| **Google OAuth** | "Connect Google Calendar" button in onboarding is static (no OAuth redirect) |
| **Stripe billing** | `stripe-placeholder.tsx` exists; no real Stripe Elements integration |
| **i18n / l10n** | No translation framework installed; all text hardcoded |
| **Offline service worker** | No `sw.js` or Workbox config; no `next-pwa` plugin |
| **Audit log UI** | Settings screen has no audit log viewer |
| **Data export UI** | Settings screen has no export button |

---

## 6. Additional Missing Pieces

### 6.1 Next.js Infrastructure

| Gap | Detail |
|---|---|
| **No `not-found.tsx`** | Any 404 URL shows a bare Next.js default 404. Fixed in Part B. |
| **No `error.tsx`** | Unhandled errors in server components surface as a generic Next.js error page with no Tidyboard branding. Fixed in Part B. |
| **No `loading.tsx`** | No streaming skeleton for route transitions. Fixed in Part B. |
| **No PWA manifest** | `layout.tsx` has no `manifest` metadata; no `public/manifest.webmanifest`. Fixed in Part B. |
| **Sparse `metadata` in `layout.tsx`** | Title and description present but no `metadataBase`, no OpenGraph, no Twitter card, no `themeColor`. Fixed in Part B. |
| **No per-route `<title>`** | All routes inherit the root title "Tidyboard — The family dashboard you actually own." — browser tab never shows page-specific titles. Fixed in Part B for server-component routes. Client-component routes (`/onboarding`, `/calendar`, `/equity`, `/lock`) need separate layout files. |
| **No `robots.ts`** | No `robots.txt` served; web crawlers get no guidance. Fixed in Part B. |
| **No `sitemap.ts`** | No sitemap. Fixed in Part B. |

### 6.2 Assets

| Gap | Detail |
|---|---|
| **No `icon-192.png` / `icon-512.png`** | Referenced in manifest (Part B) but PNG files don't exist. Browser will show no icon on install. Must be created before launch. |
| **No `apple-touch-icon.png`** | Required for iOS "Add to Home Screen" full icon. |
| **No `favicon.ico` (branded)** | `web/public/favicon.ico` exists (Next.js default) but is the default Next.js icon, not Tidyboard branded. |
| **No OG image** | `openGraph.images` in metadata will reference an image that doesn't exist until created. |

### 6.3 Dark Mode Toggle

The dark mode variants exist as separate static routes (`/calendar/day-dark`, etc.) for preview purposes. There is no user-facing dark/light toggle in the Settings screen, and no `prefers-color-scheme` media query driving the actual app's theme. The design system and spec both require dark mode as a first-class feature with auto-switching.

### 6.4 Lists / To-Do Screen

Spec §6.3 and §14 MVP both require shared/personal to-do lists. No `/lists` route or lists screen component exists anywhere in the codebase.

### 6.5 i18n Framework

Spec §14 MVP explicitly includes "i18n framework (English + German at launch)." No `next-intl`, `react-i18next`, or equivalent is installed. All UI text is hardcoded English.

### 6.6 Service Worker / Offline

Spec §14 MVP requires "Offline resilience (cached data + local mutation queue)." No service worker exists. No `next-pwa` or Workbox integration. PWA install will work (after manifest is added) but offline behavior will be a blank screen.

### 6.7 Storybook

Design system requires every component to have a Storybook story. No `.storybook/` directory exists in `web/`.

---

## Summary: Top 5 Gaps

1. **No focus rings on interactive elements** — keyboard users can't see their focus position. Affects all buttons, inputs, and interactive controls app-wide. WCAG 2.4.7 failure (Level AA).
2. **No Lists/To-Do screen** — an explicit MVP §14 requirement with no UI or route at all.
3. **No dark mode switching** — dark variants exist as preview routes only; no `prefers-color-scheme` handling or user toggle in the real app.
4. **No service worker / offline support** — MVP requires offline resilience; browser caching is the only fallback; app is a blank page offline.
5. **No i18n framework** — MVP explicitly requires English + German at launch; all text is hardcoded English strings scattered across components.
